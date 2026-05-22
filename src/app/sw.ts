// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkOnly } from "serwist";

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
    ...defaultCache,
  ],
});

serwist.addEventListeners();