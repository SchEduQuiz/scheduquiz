const CACHE_NAME = "eduquiz-v1.0.2";

self.addEventListener("install", () => {
self.skipWaiting();
});

self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then((cacheNames) =>
Promise.all(
cacheNames
.filter((cacheName) => cacheName !== CACHE_NAME)
.map((cacheName) => caches.delete(cacheName))
)
)
);

self.clients.claim();
});

self.addEventListener("fetch", (event) => {
const request = event.request;

if (request.method !== "GET") {
return;
}

// Always get the latest HTML from the network.
if (request.mode === "navigate") {
event.respondWith(
fetch(request).catch(() => caches.match("/"))
);
return;
}

// Cache static resources as they are requested.
event.respondWith(
caches.match(request).then((cachedResponse) => {
if (cachedResponse) {
return cachedResponse;
}

```
  return fetch(request).then((response) => {
    if (
      !response ||
      response.status !== 200 ||
      response.type !== "basic"
    ) {
      return response;
    }

    const responseToCache = response.clone();

    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, responseToCache);
    });

    return response;
  });
})
```

);
});

self.addEventListener("push", (event) => {
const data = event.data?.json?.() ?? {};

const title = data.title || "EduQuiz Platform";

const options = {
body: data.body || "You have a new notification.",
icon: "/icons/icon-192x192.png",
badge: "/icons/badge-72x72.png",
data: {
url: data.url || "/"
}
};

event.waitUntil(
self.registration.showNotification(title, options)
);
});

self.addEventListener("notificationclick", (event) => {
event.notification.close();

const url = event.notification.data?.url || "/";

event.waitUntil(
clients.matchAll({
type: "window",
includeUncontrolled: true
}).then((clientList) => {
for (const client of clientList) {
if ("focus" in client) {
client.navigate(url);
return client.focus();
}
}

```
  return clients.openWindow(url);
})
```

);
});
