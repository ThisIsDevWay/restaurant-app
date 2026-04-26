import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTables } from "@/db/queries/restaurant-tables";
import { getAllFixtures } from "@/db/queries/floor-fixtures";
import { getSettings } from "@/db/queries/settings";
import { TableManagerClient } from "@/app/(admin)/admin/tables/TableManagerClient";

export default async function AdminTablesPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const [tables, fixtures, settings] = await Promise.all([
    getAllTables(),
    getAllFixtures(),
    getSettings(),
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TableManagerClient initialTables={tables} initialFixtures={fixtures} initialSettings={settings} />
    </div>
  );
}
