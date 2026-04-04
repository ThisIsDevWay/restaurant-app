import { KitchenQueue } from "@/components/kitchen/KitchenQueue";
import { getSettings } from "@/db/queries/settings";

export default async function KitchenPage() {
  const settings = await getSettings();
  return <KitchenQueue restaurantName={settings?.restaurantName ?? "G&M"} logoUrl={settings?.logoUrl ?? ""} />;
}
