"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Msg = { id: string; from: string; to: string; body: string; at: string };

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const otherId = params.id;
  const [meId, setMeId] = useState("");
  const [code, setCode] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch(`/api/chat/${otherId}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = (await response.json()) as {
        error?: string;
        me?: { id: string };
        other?: { code: number };
        messages?: Msg[];
      };
      if (!response.ok) throw new Error(data.error || "채팅을 열지 못했습니다.");
      if (stop) return;
      setMeId(data.me?.id ?? "");
      setCode(data.other?.code ?? null);
      setMessages(data.messages ?? []);
      setError("");
    }
    let timer = 0;
    const tick = () => {
      load().catch((reason) => {
        if (!stop) setError(reason instanceof Error ? reason.message : "채팅을 열지 못했습니다.");
      });
      if (!stop) timer = window.setTimeout(tick, 1500);
    };
    tick();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [otherId, router]);

  useEffect(() => {
    if (!stick.current) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const response = await fetch(`/api/chat/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as { error?: string; message?: Msg };
      if (!response.ok || !data.message) throw new Error(data.error || "전송 실패");
      setMessages((prev) => (prev.some((item) => item.id === data.message!.id) ? prev : [...prev, data.message!]));
      stick.current = true;
    } catch (reason) {
      setText(body);
      setError(reason instanceof Error ? reason.message : "전송 실패");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="subhead">
        <BackButton fallback="/map" />
        <span className="me-code">{code ? `NODE ${code}` : "…"}</span>
      </div>
      <div
        className="log"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {messages.length === 0 ? <p className="hint">아직 말이 없다.</p> : null}
        {messages.map((message) => {
          const mine = message.from === meId;
          return (
            <article key={message.id} className={mine ? "msg mine" : "msg theirs"}>
              <div className="meta">
                {mine ? "나" : code ?? ""} · {clock(message.at)}
              </div>
              <p>{message.body}</p>
            </article>
          );
        })}
      </div>
      {error ? <p className="error" style={{ padding: "0 16px" }}>{error}</p> : null}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          maxLength={400}
          placeholder="메시지"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={sending || !text.trim()}>
          보내기
        </button>
      </form>
    </main>
  );
}
