function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function askNotification(): Promise<NotificationPermission> | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.requestPermission();
}

export async function subscribePush() {
  const response = await fetch("/api/push/public", { cache: "no-store" });
  const data = (await response.json()) as { publicKey: string | null };
  if (!data.publicKey || !("serviceWorker" in navigator)) return "local" as const;
  await navigator.serviceWorker.register("/sw.js");
  const ready = await navigator.serviceWorker.ready;
  const existing = await ready.pushManager.getSubscription();
  const sub =
    existing ??
    (await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));
  const saved = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!saved.ok) return "local" as const;
  return "push" as const;
}
