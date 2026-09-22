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
  slots: Slot[];
  hits: Hit[];
};
type Me = { id: string; code: number; name: string; slots: Slot[] };

const BAND_LABEL = { strong: "강", mid: "중", weak: "약" };

function overlapLine(shown: number, hits: Hit[]) {
  const count = hits.length;
  if (count === 0) {
    return shown >= 3 ? "세 문장 어디에도 겹치지 않는다." : "고른 문장에서는 겹치지 않는다.";
  }
  const strong = hits.filter((hit) => hit.band === "strong").length;
  if (shown >= 3 && count === 3 && strong > 0) return "세 문장이 겹친다.";
  if (shown >= 3 && count === 3) return "세 문장이 겹치지만, 결은 얕다.";
  if (shown >= 3 && count === 2) return "세 문장 중 두 곳이 겹친다.";
  if (count === 1 && shown === 1) {
    if (hits[0].band === "weak") return "이 문장만, 얇게 겹친다.";
    if (hits[0].band === "strong") return "이 문장이 분명히 겹친다.";
    return "이 문장에서 겹친다.";
  }
  if (count === 1 && hits[0].band === "weak") return "한 곳만, 얇게 겹친다.";
  if (count === 1 && hits[0].band === "strong") return "한 곳이 분명히 겹친다. 나머지는 다르다.";
  if (count === 1) return "한 곳만 겹친다.";
  if (count === shown) return "고른 문장이 겹친다.";
  return `고른 ${shown}곳 중 ${count}곳이 겹친다.`;
}

function relation(mine: number, theirs: number, shared: number) {
  if (mine === 2 && theirs === 2) {
    return shared > 0 ? "살고 싶은 세계가 겹친다." : "고른 세계는 다르고, 말의 결만 조금 겹친다.";
  }
  if (mine === 0 && theirs === 1) return "내가 찾는 것을, 이 노드가 내놓고 있다.";
  if (mine === 1 && theirs === 0) return "내가 내놓는 것을, 이 노드가 찾고 있다.";
  if (mine === 0 && theirs === 0) return "둘 다 비슷한 것을 찾고 있다.";
  if (mine === 1 && theirs === 1) return "둘 다 비슷한 것을 내놓고 있다.";
  if (mine === 2) return "살고 싶은 세계가, 이 노드의 다른 문장과 겹친다.";
  if (theirs === 2) return "이 문장이, 이 노드가 살고 싶은 세계와 겹친다.";
  return "두 문장의 결이 겹친다.";
}

function sharedWorlds(mine: string, theirs: string) {
  const left = new Set(parseImagine(mine).selected);
  return parseImagine(theirs).selected.filter((line) => left.has(line));
}

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

function RestSlots({ shown, hits, slots }: { shown: number[]; hits: Hit[]; slots: Slot[] }) {
  const used = new Set(
    shown.map((index) => {
      const hit = hits.find((item) => item.questionIndex === index);
      return hit ? hit.theirIndex : index;
    }),
  );
  const rest = [0, 1, 2].filter((index) => !used.has(index) && slots[index]?.answer);
  if (!rest.length) return null;
  return (
    <div className="pair">
      <p className="ask">이 노드의 나머지 문장</p>
      {rest.map((index) => (
        <div key={PROMPTS[index].key}>
          <p className="side">{PROMPTS[index].ko}</p>
          <AnswerText question={PROMPTS[index].key} answer={slots[index].answer} />
        </div>
      ))}
    </div>
  );
}

function NodeRead({ me, star, shown }: { me: Me; star: Star; shown: number[] }) {
  const hits = star.hits.filter((hit) => shown.includes(hit.questionIndex));
  return (
    <>
      <div className="who">
        <span>NODE {star.code}</span>
        <span>{star.band === "dim" ? "" : BAND_LABEL[star.band]}</span>
      </div>
      <p className="overlap">{overlapLine(shown.length, hits)}</p>
      {shown.map((index) => {
        const hit = hits.find((item) => item.questionIndex === index);
        const mine = me.slots[index]?.answer ?? "";
        const theirIndex = hit ? hit.theirIndex : index;
        const theirs = star.slots?.[theirIndex]?.answer || hit?.answer || "";
        const shared = index === 2 && theirIndex === 2 ? sharedWorlds(mine, theirs) : [];
        const same = mine.trim().length > 0 && mine.trim() === theirs.trim();
        const alreadyShown = !hit && hits.some((item) => item.theirIndex === theirIndex);
        return (
          <div className="pair" key={PROMPTS[index].key}>
            <div className="ask-row">
              <p className="ask">
                {hit ? relation(index, theirIndex, shared.length) : "이 칸은 겹치지 않는다."}
              </p>
              {hit ? <span className="axis">{BAND_LABEL[hit.band]}</span> : null}
            </div>
            {shared.length && !same ? (
              <>
                <p className="side">같이 고른 세계</p>
                <ul className="shared">
                  {shared.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {same ? (
              <>
                <p className="side">둘 다 · {PROMPTS[index].ko}</p>
                <AnswerText question={PROMPTS[index].key} answer={mine} />
              </>
            ) : (
              <>
                <p className="side">나 · {PROMPTS[index].ko}</p>
                <AnswerText question={PROMPTS[index].key} answer={mine} />
                {alreadyShown ? null : (
                  <>
                    <p className="side">이 노드 · {PROMPTS[theirIndex].ko}</p>
                    <AnswerText question={PROMPTS[theirIndex].key} answer={theirs} />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
      <RestSlots shown={shown} hits={hits} slots={star.slots ?? []} />
      <Link className="btn" href={`/chat/${star.id}`} style={{ marginTop: 14 }}>
        채팅하기
      </Link>
    </>
  );
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
        <span><i className="d dim" />있음</span>
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
          <NodeRead me={me} star={pickedStar} shown={on.length ? on : [0, 1, 2]} />
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
