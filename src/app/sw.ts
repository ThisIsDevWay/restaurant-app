// @ts-nocheck — Service Worker runs in different context
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkOnly } from "serwist";

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/auth/"),
      handler: ({ request }) => fetch(request),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: ({ request }) => fetch(request),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
