import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
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
  themeColor: "#8B2500",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="bg-bg-app text-text-main antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
