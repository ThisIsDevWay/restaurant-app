import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function getSupabaseDomain(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function getSupabaseRealtimeDomain(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    const parsed = new URL(url);
    return `wss://${parsed.host}`;
  } catch {
    return "";
  }
}

const supabaseDomain = getSupabaseDomain();
const supabaseRealtimeDomain = getSupabaseRealtimeDomain();

const nextConfig: NextConfig = {
  images: {
    // Bypass Vercel Image Optimization entirely — images are served directly
    // from Supabase Storage CDN. This eliminates /_next/image proxy overhead
    // and avoids 403s from path whitelist mismatches.
    // If Supabase Image Transformations (Pro plan) are enabled in the future,
    // remove this flag and use supabase-image-loader.ts with /render/image/.
    unoptimized: true,
  },
  async headers() {
    const cspImgSrc = supabaseDomain
      ? `'self' data: blob: ${supabaseDomain}`
      : "'self' data: blob:";
    const cspMediaSrc = supabaseDomain
      ? `'self' data: blob: ${supabaseDomain}`
      : "'self' data: blob:";
    const realtimeDomainStr = supabaseRealtimeDomain ? ` ${supabaseRealtimeDomain}` : "";
    const cspConnectSrc = supabaseDomain
      ? `'self' ${supabaseDomain}${realtimeDomainStr} https://*.sentry.io wss://38.171.255.120`
      : "'self' https://*.sentry.io wss://38.171.255.120";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' y 'unsafe-eval' son necesarios para Next.js
              // Monitorear si se puede eliminar en futuras versiones
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src ${cspImgSrc}`,
              `media-src ${cspMediaSrc}`,
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src ${cspConnectSrc}`,
              "frame-src 'self' blob:",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

export default withBundleAnalyzer(withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
  },
}));