import { requireKitchenOrAdmin } from "@/lib/auth";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireKitchenOrAdmin();
  return <>{children}</>;
}
