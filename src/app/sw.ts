// @ts-nocheck — Service Worker runs in different context
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      handler: "NetworkOnly" as const,
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
    },
  ],
});

serwist.addEventListeners();
