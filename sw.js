const CACHE_NAME = "diary-pwa-v1";

/* キャッシュするファイル */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", (event) => {
  console.log("SW INSTALL");

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error("CACHE ADD ERROR:", err);
      })
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", (event) => {
  console.log("SW ACTIVATE");

  event.waitUntil(
    (async () => {

      /* 古いキャッシュ削除 */
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("DELETE OLD CACHE:", key);
            return caches.delete(key);
          }
        })
      );

      /* 即時制御 */
      await clients.claim();

    })()
  );
});

/* =========================
   FETCH
========================= */
self.addEventListener("fetch", (event) => {

  /* GETのみ */
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {

      const cache = await caches.open(CACHE_NAME);

      /* キャッシュ確認 */
      const cached = await cache.match(event.request);

      if (cached) {
        return cached;
      }

      try {

        /* ネット取得 */
        const response = await fetch(event.request);

        /* 正常レスポンスだけ保存 */
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          cache.put(event.request, response.clone());
        }

        return response;

      } catch (err) {

        console.error("FETCH ERROR:", err);

        /* index fallback */
        const fallback = await cache.match("./index.html");

        if (fallback) {
          return fallback;
        }

        return new Response("OFFLINE", {
          status: 503,
          statusText: "OFFLINE"
        });
      }

    })()
  );
});

/* =========================
   MESSAGE
========================= */
self.addEventListener("message", (event) => {

  if (!event.data) return;

  /* 手動更新 */
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

});

/* =========================
   ERROR
========================= */
self.addEventListener("error", (event) => {
  console.error("SW ERROR:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("SW PROMISE ERROR:", event.reason);
});