"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { askNotification, subscribePush } from "@/components/alerts";
import { BackButton } from "@/components/BackButton";
import { InstallCard } from "@/components/InstallCard";
import { parseImagine } from "@/lib/imagine";
import { IMAGINE_COPY, IMAGINE_WORLDS, PROMPTS } from "@/lib/prompts";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [seek, setSeek] = useState("");
  const [offer, setOffer] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [words, setWords] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: { name: string; slots: { answer: string }[] } | null }) => {
        if (!data.me) return;
        setEditing(true);
        setName(data.me.name === "손님" ? "" : data.me.name);
        const slots = data.me.slots ?? [];
        setSeek(slots[0]?.answer ?? "");
        setOffer(slots[1]?.answer ?? "");
        const imagine = parseImagine(slots[2]?.answer ?? "");
        setSelected(imagine.selected);
        setWords(imagine.words);
      })
      .catch(() => undefined);
  }, []);

  function toggleWorld(world: string) {
    setSelected((prev) => (prev.includes(world) ? prev.filter((item) => item !== world) : [...prev, world]));
  }

  async function submit() {
    setError("");
    setPending(true);
    const perm = askNotification();
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slots: [{ answer: seek }, { answer: offer }, { selected, words }],
          update: editing,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "저장 실패");
      if (perm && (await perm) === "granted") {
        await Promise.race([
          subscribePush().catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
      router.push("/map");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "저장 실패");
      setPending(false);
    }
  }

  const textSlots = [
    { prompt: PROMPTS[0], value: seek, set: setSeek },
    { prompt: PROMPTS[1], value: offer, set: setOffer },
  ];

  return (
    <main className="pad">
      <BackButton fallback={editing ? "/map" : "/"} />
      <h1 className="lede">{editing ? "문장 고치기" : "노드 만들기"}</h1>
      <p className="sub">같은 결을 찾기 위한 말이다. SEEK와 OFFER는 짧게, IMAGINE은 세계를 고른다.</p>

      <label className="field" style={{ marginTop: 18 }}>
        <span>이름</span>
        <input value={name} maxLength={20} placeholder="비우면 손님" onChange={(event) => setName(event.target.value)} />
      </label>

      {textSlots.map(({ prompt, value, set }) => (
        <section key={prompt.key}>
          <div className="slot-no">{prompt.title}</div>
          <p className="hint">
            {prompt.ko}. {prompt.guide}
          </p>
          <label className="field">
            <textarea
              rows={2}
              maxLength={180}
              value={value}
              placeholder={prompt.placeholder}
              onChange={(event) => set(event.target.value)}
            />
          </label>
        </section>
      ))}

      <section>
        <div className="slot-no">{PROMPTS[2].title}</div>
        <p className="imagine-lead">{IMAGINE_COPY.question}</p>
        <p className="hint">{IMAGINE_COPY.note}</p>
        <div className="worlds">
          {IMAGINE_WORLDS.map((world) => {
            const on = selected.includes(world);
            return (
              <button
                key={world}
                type="button"
                className={on ? "q on" : "q"}
                aria-pressed={on}
                onClick={() => toggleWorld(world)}
              >
                {world}
              </button>
            );
          })}
        </div>
        <label className="field">
          <span>{IMAGINE_COPY.optional}</span>
          <textarea
            rows={3}
            maxLength={500}
            value={words}
            placeholder={PROMPTS[2].placeholder}
            onChange={(event) => setWords(event.target.value)}
          />
        </label>
      </section>

      <InstallCard />

      <button className="btn" type="button" disabled={pending} onClick={submit} style={{ marginTop: 8 }}>
        {pending ? "…" : "알림 허용하고 들어가기"}
      </button>
      <p className="hint" style={{ marginTop: 10 }}>
        알림을 거절해도 들어간다. 새 말은 상단 종에 쌓인다. 아이폰은 홈 화면 아이콘으로 다시 열어야 탭을 닫아도
        알림이 온다.
      </p>
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
