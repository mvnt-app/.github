"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function Bell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.6a3.2 3.2 0 0 0-3.2 3.2v1.1c0 .7-.2 1.4-.7 2L3.2 9.2c-.5.6-.1 1.5.7 1.5h8.2c.8 0 1.2-.9.7-1.5l-.9-1.3c-.5-.6-.7-1.3-.7-2V4.8A3.2 3.2 0 0 0 8 1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M6.4 12.2a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [code, setCode] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let stop = false;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { me?: { code?: number } | null }) => {
        if (!stop) setCode(data.me?.code ?? null);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [pathname]);

  useEffect(() => {
    const onInbox = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      setUnread(detail?.unreadCount ?? 0);
    };
    window.addEventListener("node-inbox", onInbox);
    return () => window.removeEventListener("node-inbox", onInbox);
  }, []);

  return (
    <header className="top">
      <Link href={code ? "/map" : "/"} className="mark">
        NODE
      </Link>
      {code ? (
        <div className="top-actions">
          <Link href="/inbox" className="bell" aria-label={unread > 0 ? `알림 ${unread}` : "알림"}>
            <Bell />
            {unread > 0 ? <i className="pip" /> : null}
          </Link>
          <Link href="/map" className="me-code">
            {code}
          </Link>
        </div>
      ) : (
        <span />
      )}
    </header>
  );
}
