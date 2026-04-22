import type { Metadata, Viewport } from "next";
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${epilogue.variable}`} suppressHydrationWarning>
      <body className="bg-bg-app text-text-main antialiased" suppressHydrationWarning>
        {children}
        <Toaster 
          position="bottom-center" 
          richColors 
          toastOptions={{ style: { marginBottom: "80px" } }} 
        />
      </body>
    </html>
  );
}
