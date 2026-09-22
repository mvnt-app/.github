"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Thread = {
  otherId: string;
  code: number;
  name: string;
  lastBody: string;
  lastAt: string;
  unread: number;
};

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/inbox", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { threads?: Thread[] };
      if (!stop) setThreads(data.threads ?? []);
    }
    const timer = window.setInterval(() => void load(), 1600);
    void load();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="pad">
      <BackButton fallback="/map" />
      <h1 className="lede">받은 말</h1>
      {threads.length === 0 ? <p className="hint">아직 대화가 없다.</p> : null}
      <div className="threads">
        {threads.map((thread) => (
          <Link
            key={thread.otherId}
            href={`/chat/${thread.otherId}`}
            className={thread.unread ? "thread unread" : "thread"}
          >
            <div className="meta">
              <span>NODE {thread.code}</span>
              <span>
                {thread.unread ? `${thread.unread} ` : ""}
                {clock(thread.lastAt)}
              </span>
            </div>
            <p>{thread.lastBody}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
