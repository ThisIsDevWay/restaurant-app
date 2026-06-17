import type { Metadata, Viewport } from "next";
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const epilogue = Epilogue({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

import { getSettings } from "@/db/queries/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settings?.restaurantName ?? "G&M";

  return {
    title: `${name} — Restaurante`,
    description: "Haz tu pedido desde tu teléfono",
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.png",
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#bb0005",
  width: "device-width",
  initialScale: 1,
};

import { ThemeManager } from "@/components/shared/ThemeManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${epilogue.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://wsrv.nl" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var isAppRoute = path.startsWith('/admin') || path.startsWith('/kitchen') || path.startsWith('/login');
                  var saved = localStorage.getItem('theme');
                  if (!isAppRoute && saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="bg-bg-app text-text-main antialiased" suppressHydrationWarning>
        <QueryProvider>
          <ThemeManager />
          {children}
          <Toaster
            position="bottom-center"
            richColors
            toastOptions={{ style: { marginBottom: "80px" } }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
