"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { askNotification, subscribePush } from "@/components/alerts";

type Me = { id: string; code: number; name: string } | null;

export default function GatePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [testAgents, setTestAgents] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me: Me; testAgents?: boolean; error?: string }) => {
        if (data.error) setError(data.error);
        setMe(data.me ?? null);
        setTestAgents(data.testAgents !== false);
      })
      .catch(() => setError("세션을 읽지 못했습니다."));
  }, []);

  async function enterAgent(agent: "a" | "b") {
    setError("");
    setPending(agent);
    const perm = askNotification();
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "입장 실패");
      if (perm && (await perm) === "granted") {
        await Promise.race([
          subscribePush().catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
      router.push("/map");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "입장 실패");
      setPending(null);
    }
  }

  return (
    <main className="pad">
      <h1 className="lede">
        같은 결만
        <br />
        밝힌다.
      </h1>
      <p className="sub">SEEK, OFFER, IMAGINE. 라이프가 묶이는 노드를 찾는다.</p>

      <div className="stack">
        {me ? (
          <a className="btn" href="/map">
            내 맵 · {me.code}
          </a>
        ) : (
          <a className="btn" href="/join">
            노드 만들기
          </a>
        )}
        {!me && !testAgents ? (
          <p className="hint">두 사람이 각자 노드를 만들면 상대가 별자리에 나타난다. 결이 약해도 희미한 점으로 남고, 눌러서 채팅할 수 있다.</p>
        ) : null}
        {testAgents ? (
          <>
            <p className="hint">테스트는 탭을 두 개 열어 A와 B로 들어간다.</p>
            <div className="row">
              <button className="btn-ghost" type="button" disabled={pending !== null} onClick={() => enterAgent("a")}>
                {pending === "a" ? "…" : "에이전트 A · 11"}
              </button>
              <button className="btn-ghost" type="button" disabled={pending !== null} onClick={() => enterAgent("b")}>
                {pending === "b" ? "…" : "에이전트 B · 12"}
              </button>
            </div>
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}
