import { QueryProvider } from "@/providers/QueryProvider";
import { Sidebar } from "@/components/admin/layout/Sidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-bg-app">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 lg:pl-16">
          <AdminHeader />
          <main className="flex-1 p-2 sm:p-2 lg:p-4 lg:pt-2">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
