/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// vite-plugin-pwa injectManifest: include __WB_MANIFEST so the plugin can inject precache entries
// @ts-ignore
const precacheManifest: Array<{ url: string; revision: string | null }> = self.__WB_MANIFEST || [];

// Simple precaching without workbox
const CACHE_NAME = "toeic-app-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(precacheManifest.map((e) => e.url)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first fetch strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request) as Promise<Response>)
  );
});

// --- Nag Notification Scheduler ---

let nagTimer: ReturnType<typeof setTimeout> | null = null;

const NAG_MESSAGES = [
  {
    title: "Hey!! 💢",
    body: "Umm you still haven't studied today?? Your exam is coming~",
  },
  {
    title: "Excuse me??? 🤷‍♀️",
    body: "You wanna stay at 300 forever? Open the app. NOW.",
  },
  {
    title: "Helloooo~ 👀",
    body: "No study session today? That's literally not it bestie 💢",
  },
  {
    title: "I'm watching you lol 😤",
    body: "Still no quiz today?? Your accuracy won't fix itself ya know~",
  },
];

function getRandomNagMessage() {
  return NAG_MESSAGES[Math.floor(Math.random() * NAG_MESSAGES.length)];
}

function scheduleNag(targetHour: number) {
  if (nagTimer) {
    clearTimeout(nagTimer);
    nagTimer = null;
  }

  const now = new Date();
  const target = new Date();
  target.setHours(targetHour, 0, 0, 0);

  // If target time already passed today, skip
  if (target <= now) return;

  const delay = target.getTime() - now.getTime();
  const iconUrl = new URL("icon-192.png", self.registration.scope).href;

  nagTimer = setTimeout(async () => {
    const msg = getRandomNagMessage();
    await self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: "daily-nag",
      requireInteraction: true,
      data: { url: self.registration.scope },
    });
  }, delay);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data?.type) return;

  if (data.type === "SCHEDULE_NAG") {
    const { studyDone, targetHour = 21 } = data;
    if (studyDone) {
      if (nagTimer) {
        clearTimeout(nagTimer);
        nagTimer = null;
      }
    } else {
      scheduleNag(targetHour);
    }
  }

  if (data.type === "TEST_NAG") {
    const msg = getRandomNagMessage();
    const iconUrl = new URL("icon-192.png", self.registration.scope).href;
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: "daily-nag-test",
      requireInteraction: true,
      data: { url: self.registration.scope },
    });
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Open/focus app when notification is tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const appUrl = event.notification.data?.url ?? self.registration.scope;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.startsWith(appUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(appUrl);
      })
  );
});
