const CACHE_NAME = "eduquiz-v1.0.1";

// Install
self.addEventListener("install", (event) => {
console.log("EduQuiz Service Worker installing...");

// Activate the new Service Worker immediately.
self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
console.log("EduQuiz Service Worker activating...");

event.waitUntil(
Promise.all([
// Delete old EduQuiz caches.
caches.keys().then((cacheNames) =>
Promise.all(
cacheNames
.filter(
(cacheName) =>
cacheName.startsWith("eduquiz-") &&
cacheName !== CACHE_NAME
)
.map((cacheName) => {
console.log("Deleting old cache:", cacheName);
return caches.delete(cacheName);
})
)
),

```
  // Take control of open pages immediately.
  self.clients.claim()
])
```

);
});

// Fetch
self.addEventListener("fetch", (event) => {
const request = event.request;

// Only handle GET requests.
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

// Cache-first for static resources.
event.respondWith(
caches.match(request).then((cachedResponse) => {
if (cachedResponse) {
return cachedResponse;
}

```
  return fetch(request).then((response) => {
    // Don't cache unsuccessful or cross-origin responses.
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

// Push notifications
self.addEventListener("push", (event) => {
let data = {};

try {
data = event.data ? event.data.json() : {};
} catch (error) {
console.error("Invalid push notification data:", error);

```
data = {
  body: event.data ? event.data.text() : "New notification"
};
```

}

const options = {
body: data.body || "You have a new notification.",
icon: "/icons/icon-192x192.png",
badge: "/icons/badge-72x72.png",
vibrate: [100, 50, 100],
data: {
url: data.url || "/",
dateOfArrival: Date.now()
}
};

event.waitUntil(
self.registration.showNotification(
data.title || "EduQuiz Platform",
options
)
);
});

// Notification clicks
self.addEventListener("notificationclick", (event) => {
event.notification.close();

const url = event.notification.data?.url || "/";

event.waitUntil(
self.clients
.matchAll({
type: "window",
includeUncontrolled: true
})
.then((clientList) => {
// Focus an existing EduQuiz tab if possible.
for (const client of clientList) {
if ("focus" in client) {
client.navigate(url);
return client.focus();
}
}

```
    // Otherwise open a new window.
    return self.clients.openWindow(url);
  })
```

);
});

// Optional background sync
self.addEventListener("sync", (event) => {
if (event.tag === "background-sync") {
console.log("Background sync triggered");

```
event.waitUntil(doBackgroundSync());
```

}
});

async function doBackgroundSync() {
// Add offline action synchronization here when needed.
return Promise.resolve();
}

// Allow the application to force activation.
self.addEventListener("message", (event) => {
if (event.data?.type === "SKIP_WAITING") {
self.skipWaiting();
}
});
