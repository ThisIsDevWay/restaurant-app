import { QueryProvider } from "@/providers/QueryProvider";
import { OfflineBanner } from "@/components/client/OfflineBanner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <OfflineBanner />
      {children}
    </QueryProvider>
  );
}
