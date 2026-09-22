"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sky, type SkyStar } from "@/components/Sky";
import { parseImagine } from "@/lib/imagine";
import { placeStars } from "@/lib/layout";
import { PROMPTS } from "@/lib/prompts";

type Slot = { question: string; answer: string };
type Hit = {
  questionIndex: number;
  theirIndex: number;
  band: "weak" | "mid" | "strong";
  answer: string;
};
type Star = {
  id: string;
  code: number;
  name: string;
  band: "dim" | "weak" | "mid" | "strong";
  hits: Hit[];
};
type Me = { id: string; code: number; name: string; slots: Slot[] };

const BAND_LABEL = { strong: "강", mid: "중", weak: "약" };

function AnswerText({ question, answer }: { question: string; answer: string }) {
  if (question === "IMAGINE") {
    const imagine = parseImagine(answer);
    if (imagine.selected.length) {
      return (
        <div className="say imagine-read">
          {imagine.selected.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {imagine.words ? <p className="own">{imagine.words}</p> : null}
        </div>
      );
    }
  }
  return <p className="say">{answer}</p>;
}

export function MapScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [matcher, setMatcher] = useState<"theme" | "embed">("theme");
  const [on, setOn] = useState<number[]>([0, 1, 2]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onKey = on.join(",");

  useEffect(() => {
    let stop = false;

    async function load() {
      const response = await fetch(`/api/map?on=${onKey}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        matcher?: "theme" | "embed";
        me?: Me;
        stars?: Star[];
      };
      if (!response.ok) throw new Error(data.error || "맵을 열지 못했습니다.");
      if (stop) return;
      setMe(data.me ?? null);
      setStars(data.stars ?? []);
      setMatcher(data.matcher ?? "theme");
      setError("");
    }

    let timer = 0;
    const tick = () => {
      load().catch((reason) => {
        if (!stop) setError(reason instanceof Error ? reason.message : "맵을 열지 못했습니다.");
      });
      if (!stop) timer = window.setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [onKey, router]);

  const skyStars: SkyStar[] = useMemo(() => {
    if (!me) return [];
    const points = placeStars(me, stars);
    const selfPoint = points.get(me.id)!;
    const list: SkyStar[] = [
      {
        id: me.id,
        code: me.code,
        x: selfPoint.x,
        y: selfPoint.y,
        band: "self",
        selected: picked === me.id,
      },
    ];
    for (const star of stars) {
      const point = points.get(star.id);
      if (!point) continue;
      list.push({
        id: star.id,
        code: star.code,
        x: point.x,
        y: point.y,
        band: star.band,
        selected: picked === star.id,
      });
    }
    return list;
  }, [me, stars, picked]);

  const pickedStar = stars.find((star) => star.id === picked) ?? null;

  async function leave() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/");
    router.refresh();
  }

  return (
    <main>
      <div className="qs">
        {PROMPTS.map((prompt, index) => {
          const active = on.includes(index);
          return (
            <button
              key={prompt.key}
              type="button"
              className={active ? "q on" : "q"}
              aria-pressed={active}
              onClick={() =>
                setOn((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index].sort()))
              }
            >
              {prompt.key}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="d weak" />약</span>
        <span><i className="d mid" />중</span>
        <span><i className="d strong" />강</span>
        <span className="spacer">{matcher === "embed" ? "임베딩" : "로컬 매칭"}</span>
      </div>
      {me ? <Sky stars={skyStars} onPick={setPicked} /> : <div className="sky" />}
      <p className="hint drag-hint">드래그로 이동, 핀치나 버튼으로 확대.</p>

      {error ? <p className="error" style={{ padding: "10px 16px 0" }}>{error}</p> : null}

      <section className="panel">
        {!me ? (
          <p className="hint">불러오는 중</p>
        ) : picked === me.id ? (
          <>
            <div className="who">
              <span>NODE {me.code}</span>
              <span>나</span>
            </div>
            <div className="mine-list">
              {me.slots.map((slot, index) => (
                <div key={PROMPTS[index].key}>
                  <p className="ask">{PROMPTS[index].key} · {PROMPTS[index].ko}</p>
                  <AnswerText question={PROMPTS[index].key} answer={slot.answer} />
                </div>
              ))}
            </div>
            <Link className="btn" href="/join" style={{ marginTop: 14 }}>
              질문 고치기
            </Link>
          </>
        ) : pickedStar ? (
          <>
            <div className="who">
              <span>NODE {pickedStar.code}</span>
              <span>{pickedStar.band === "dim" ? "" : BAND_LABEL[pickedStar.band]}</span>
            </div>
            {pickedStar.hits.map((hit) => (
              <div key={hit.questionIndex}>
                <p className="ask">
                  내 {PROMPTS[hit.questionIndex].key} · 상대 {PROMPTS[hit.theirIndex].key}
                </p>
                <AnswerText question={PROMPTS[hit.theirIndex].key} answer={hit.answer} />
              </div>
            ))}
            {pickedStar.hits.length === 0 ? <p className="hint">겹치는 답은 없다.</p> : null}
            <Link className="btn" href={`/chat/${pickedStar.id}`} style={{ marginTop: 14 }}>
              채팅하기
            </Link>
          </>
        ) : (
          <p className="hint">노드를 고르면 그 답이 여기 나온다. 빈 고리는 나.</p>
        )}
        <button className="btn-ghost" type="button" onClick={leave} style={{ marginTop: 8 }}>
          나가기
        </button>
      </section>
    </main>
  );
}
