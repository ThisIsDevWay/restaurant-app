// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  NetworkOnly,
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  createPartialResponse,
} from "serwist";

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes: always network, never cache
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },

    // Supabase videos: never cache (large, TV always has connection)
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("supabase.co") &&
        /\.(?:mp4|webm|mov)$/i.test(url.pathname),
      handler: new NetworkOnly(),
    },

    // ImageKit videos: CacheFirst with no limit on entries or size to protect ImageKit bandwidth.
    // Matcher detects: file extension (.mp4/.webm/.mov) OR tv-media path segment.
    // This MUST be placed before the images matcher and the NetworkOnly catch-all.
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("ik.imagekit.io") &&
        !/\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname) &&
        (/\.(?:mp4|webm|mov)$/i.test(url.pathname) ||
          url.pathname.includes("/tv-media/") ||
          url.pathname.includes("/tv_media/")),
      handler: async ({ request, event }) => {
        const CACHE_NAME = "imagekit-videos";

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return createPartialResponse(request, cachedResponse);
        }

        // Strip Range header so we fetch and store the full video blob
        const cleanHeaders = new Headers();
        for (const [k, v] of request.headers.entries()) {
          if (k.toLowerCase() !== "range") cleanHeaders.set(k, v);
        }
        const cleanRequest = new Request(request.url, {
          headers: cleanHeaders,
          method: request.method,
          mode: "cors",
          credentials: "omit",
        });

        try {
          const networkResponse = await fetch(cleanRequest);

          if (networkResponse.status === 200) {
            const toCache = networkResponse.clone();

            const storePromise = (async () => {
              try {
                await cache.put(request, toCache);
              } catch (err) {
                // QuotaExceededError or other cache errors: skip caching silently
              }
            })();

            if (event && typeof event.waitUntil === "function") {
              event.waitUntil(storePromise);
            } else {
              await storePromise;
            }

            return createPartialResponse(request, networkResponse);
          }

          return fetch(request);
        } catch {
          return fetch(request);
        }
      },
    },

    // ImageKit images & wsrv.nl proxied images: CacheFirst, 7-day TTL, 80 entries max
    {
      matcher: ({ url }: { url: URL }) =>
        (url.hostname.includes("ik.imagekit.io") &&
          /\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname)) ||
        (url.hostname.includes("wsrv.nl") &&
          url.search.includes("ik.imagekit.io")),
      handler: new CacheFirst({
        cacheName: "imagekit-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 80,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (reduced from 30)
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    // Catch-all for any remaining ImageKit URL not matched above
    // (prevents unmatched URLs from falling into defaultCache's unlimited StaleWhileRevalidate)
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("ik.imagekit.io"),
      handler: new NetworkOnly(),
    },

    ...defaultCache,
  ],
});

// Activate: delete obsolete cache buckets and keep video/image caches intact
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Known valid cache names (SW will manage these)
      const KNOWN_CACHES = new Set([
        "imagekit-videos",
        "imagekit-images",
      ]);

      try {
        const allCacheNames = await caches.keys();

        for (const name of allCacheNames) {
          if (
            name !== "imagekit-videos" &&
            !KNOWN_CACHES.has(name) &&
            !name.startsWith("serwist-precache") &&
            !name.startsWith("serwist-runtime")
          ) {
            // Delete leftover caches from old SW versions (workbox-*, old custom names, etc.)
            await caches.delete(name);
          }
        }
      } catch (e) {
        // Best-effort: never block SW activation
      }
    })()
  );
});

serwist.addEventListeners();