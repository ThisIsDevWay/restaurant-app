import { QueryProvider } from "@/providers/QueryProvider";
import { requireWaiterOrAdmin } from "@/lib/auth";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  await requireWaiterOrAdmin();
  return <QueryProvider>{children}</QueryProvider>;
}
