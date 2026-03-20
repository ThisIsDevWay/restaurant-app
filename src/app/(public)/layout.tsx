import { QueryProvider } from "@/providers/QueryProvider";
import { OfflineBanner } from "@/components/client/OfflineBanner";
import { Cart } from "@/components/public/cart/Cart";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <OfflineBanner />
      {children}
      <Cart />
    </QueryProvider>
  );
}
