import { notFound, redirect } from "next/navigation";
import { getTableByToken } from "@/db/queries/restaurant-tables";

export default async function TableQRPage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = await params;
  const table = await getTableByToken(token);
  
  if (!table) {
    notFound();
  }
  
  if (!table.isActive) {
    redirect("/?error=mesa-inactiva");
  }
  
  redirect(`/waiter?table=${encodeURIComponent(table.label)}`);
}
