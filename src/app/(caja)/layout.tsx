import { QueryProvider } from "@/providers/QueryProvider";
import { requireCashierOrAdmin } from "@/lib/auth";

export default async function CajaLayout({ children }: { children: React.ReactNode }) {
  await requireCashierOrAdmin();
  return <QueryProvider>{children}</QueryProvider>;
}
