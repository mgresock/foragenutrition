// Forage service worker — receives web-push reminders and opens the app on tap.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "Forage";
  const options = {
    body: data.body || "Time to log your meals.",
    icon: "/api/icon/192",
    badge: "/api/icon/192",
    tag: data.tag || "forage-reminder",
    data: { url: data.url || "/dashboard/calories" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/calories";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
