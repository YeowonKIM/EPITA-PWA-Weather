const CACHE_NAME = "weather-app-v6";
const urlsToCache = ["index.html", "offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match("offline.html"));
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhiteList = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!cacheWhiteList.includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Push notification
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {
    title: "Weather notification",
    body: "Check today's weather!",
  };

  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-weather") {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  const requests = await getQueuedRequests(); 
  for (const city of requests) {
    try {
      await fetch(`https://api.weatherapi.com/v1/current.json?q=${city}&key=b0a7bad410d5400c8c3145734251107`);
      console.log(`Synced city: ${city}`);
      removeQueuedRequest(city);
    } catch (err) {
      console.error(`Failed to sync city: ${city}`, err);
    }
  }
}

const queueRequest = async (city) => {
  const current = JSON.parse(localStorage.getItem("queuedCities") || "[]");

  if (!current.includes(city)) {
    localStorage.setItem("queuedCities", JSON.stringify([...current, city]));
  }

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register("sync-weather");
      console.log("Queued for background sync:", city);
    } catch (err) {
      console.error("Failed to register sync:", err);
    }
  } else {
    console.warn("Background sync not supported");
  }
};

function removeQueuedRequest(city) {
  const requests = JSON.parse(localStorage.getItem("queuedCities") || "[]");
  const updated = requests.filter((c) => c !== city);
  localStorage.setItem("queuedCities", JSON.stringify(updated));
}

