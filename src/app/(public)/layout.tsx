"use client";

import { QueryProvider } from "@/providers/QueryProvider";
import { OfflineBanner } from "@/components/customer/OfflineBanner";
import { BottomNav } from "@/components/public/BottomNav";
import { usePathname } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showBottomNav = pathname !== "/checkout";

  return (
    <QueryProvider>
      <OfflineBanner />
      {children}
      {showBottomNav && <BottomNav />}
    </QueryProvider>
  );
}
