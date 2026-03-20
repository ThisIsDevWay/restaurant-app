import { QueryProvider } from "@/providers/QueryProvider";
import { Sidebar } from "@/components/admin/layout/Sidebar";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-bg-app p-6">{children}</main>
      </div>
    </QueryProvider>
  );
}
