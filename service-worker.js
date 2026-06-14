const CACHE_NAME = "kisan-manager-v24";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./db.js",
  "./app.js",
  "./firebase-config.js",
  "./firebase-auth.js",
  "./firebase-sync.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(event) {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(networkResponse) {
      const responseClone = networkResponse.clone();

      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, responseClone).catch(function() {});
      });

      return networkResponse;
    }).catch(function() {
      return caches.match(event.request).then(function(cachedResponse) {
        return cachedResponse || caches.match("./index.html");
      });
    })
  );
});
