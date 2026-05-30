import { OfflineBanner } from "@/components/customer/OfflineBanner";
import { BottomNavWrapper } from "@/components/public/BottomNavWrapper";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OfflineBanner />
      {children}
      <BottomNavWrapper />
    </>
  );
}
