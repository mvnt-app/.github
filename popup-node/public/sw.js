self.addEventListener("push", (event) => {
  let data = { title: "NODE", body: "새 메시지", url: "/inbox" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // 본문이 비어도 알림은 띄운다.
  }
  event.waitUntil(
    (async () => {
      const opened = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = opened.some((client) => client.focused && client.url.includes("/chat/"));
      if (focused) return;
      await self.registration.showNotification(data.title, {
        body: data.body,
        data: { url: data.url },
        tag: data.url,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/inbox";
  event.waitUntil(self.clients.openWindow(url));
});
