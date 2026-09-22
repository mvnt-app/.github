"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { askNotification, subscribePush } from "@/components/alerts";
import { InstallCard } from "@/components/InstallCard";
import { PROMPTS } from "@/lib/prompts";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slots, setSlots] = useState(["", "", ""]);
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
        if (data.me.slots?.length === 3) setSlots(data.me.slots.map((slot) => slot.answer));
      })
      .catch(() => undefined);
  }, []);

  function setSlot(index: number, value: string) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? value : slot)));
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
          slots: slots.map((answer) => ({ answer })),
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

  return (
    <main className="pad">
      <h1 className="lede">{editing ? "문장 고치기" : "노드 만들기"}</h1>
      <p className="sub">세 문장이다. 질문과 답이 아니라, 같은 결을 찾기 위한 말이다.</p>

      <label className="field" style={{ marginTop: 18 }}>
        <span>이름</span>
        <input value={name} maxLength={20} placeholder="비우면 손님" onChange={(event) => setName(event.target.value)} />
      </label>

      {PROMPTS.map((prompt, index) => (
        <section key={prompt.key}>
          <div className="slot-no">{prompt.title}</div>
          <p className="hint">
            {prompt.ko}. {prompt.guide}
          </p>
          <label className="field">
            <textarea
              rows={2}
              maxLength={180}
              value={slots[index]}
              placeholder={prompt.placeholder}
              onChange={(event) => setSlot(index, event.target.value)}
            />
          </label>
        </section>
      ))}

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
