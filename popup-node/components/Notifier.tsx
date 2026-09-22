"use client";

import { useEffect } from "react";

type Incoming = { id: string; fromId: string; fromCode: number; body: string };

export function Notifier() {
  useEffect(() => {
    let stop = false;
    const seen = new Set<string>();
    let primed = false;

    async function tick() {
      if (stop) return;
      try {
        const response = await fetch("/api/inbox", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as {
            unreadCount?: number;
            incoming?: Incoming[];
            threads?: unknown[];
          };
          window.dispatchEvent(new CustomEvent("node-inbox", { detail: data }));
          const incoming = data.incoming ?? [];
          if (!primed) {
            for (const item of incoming) seen.add(item.id);
            primed = true;
          } else {
            let pushCovers = false;
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.getRegistration();
              pushCovers = Boolean(await reg?.pushManager.getSubscription());
            }
            const canToast =
              document.hidden &&
              !pushCovers &&
              "Notification" in window &&
              Notification.permission === "granted";
            for (const item of incoming) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              if (!canToast) continue;
              const note = new Notification(`NODE ${item.fromCode}`, {
                body: item.body,
                tag: item.id,
              });
              note.onclick = () => {
                window.focus();
                window.location.href = `/chat/${item.fromId}`;
              };
            }
          }
        }
      } catch {
        // 다음 주기에 다시 본다.
      }
      if (!stop) window.setTimeout(tick, 1600);
    }

    void tick();
    return () => {
      stop = true;
    };
  }, []);

  return null;
}
