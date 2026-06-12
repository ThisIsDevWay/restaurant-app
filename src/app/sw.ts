// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  NetworkOnly,
  CacheFirst,
  RangeRequestsPlugin,
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
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    // Videos from Supabase Storage are never cached — they're large and
    // the TV screen always has a stable connection.
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("supabase.co") &&
        /\.(?:mp4|webm|mov)$/i.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // Videos from ImageKit (CDN): Cache first with range requests support
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("ik.imagekit.io") &&
        /\.(?:mp4|webm|mov)$/i.test(url.pathname),
      handler: async ({ request, event }) => {
        const cacheName = "imagekit-videos";
        const cache = await caches.open(cacheName);
        let cachedResponse = await cache.match(request);

        if (cachedResponse) {
          return createPartialResponse(request, cachedResponse);
        }

        // Cache miss! Fetch the FULL video to store it.
        const cleanHeaders = new Headers(request.headers);
        cleanHeaders.delete("range");

        const cleanRequest = new Request(request.url, {
          headers: cleanHeaders,
          method: request.method,
          mode: "cors",
          credentials: "omit",
        });

        try {
          const networkResponse = await fetch(cleanRequest);
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            if (event && typeof event.waitUntil === "function") {
              event.waitUntil(cache.put(request, responseClone));
            } else {
              await cache.put(request, responseClone);
            }
            return createPartialResponse(request, networkResponse);
          }
          // If not 200, fall back to standard fetch
          return fetch(request);
        } catch (err) {
          // If fetch fails, fall back to network fetch
          return fetch(request);
        }
      },
    },
    // Images from ImageKit: Cache first for performance
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.includes("ik.imagekit.io") &&
        /\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "imagekit-images",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();