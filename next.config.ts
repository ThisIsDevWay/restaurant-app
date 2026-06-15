import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function getSupabaseRealtimeDomain(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    const parsed = new URL(url);
    return `wss://${parsed.host}`;
  } catch {
    return "";
  }
}

function getImagekitDomain(): string {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";
  try {
    return new URL(endpoint).origin;
  } catch {
    return "https://ik.imagekit.io";
  }
}

const supabaseRealtimeDomain = getSupabaseRealtimeDomain();
const imagekitDomain = getImagekitDomain();

const imagekitHostname = (() => {
  try {
    return new URL(imagekitDomain).hostname;
  } catch {
    return "ik.imagekit.io";
  }
})();

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: imagekitHostname,
      },
    ],
  },
  async headers() {
    const cspImgSrc = `'self' data: blob: ${imagekitDomain} https://wsrv.nl`;
    const cspMediaSrc = `'self' data: blob: ${imagekitDomain}`;
    const realtimeDomainStr = supabaseRealtimeDomain ? ` ${supabaseRealtimeDomain}` : "";
    const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? ` ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
      : "";
    const cspConnectSrc = `'self'${supabaseOrigin}${realtimeDomainStr} https://upload.imagekit.io ${imagekitDomain} https://wsrv.nl https://*.sentry.io wss://38.171.255.120`;

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