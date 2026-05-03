import { getSettings } from "@/db/queries/settings";
import { KitchenQueueDynamic } from "@/components/kitchen/KitchenQueueDynamic";

export default async function KitchenPage() {
  const settings = await getSettings();
  return <KitchenQueueDynamic restaurantName={settings?.restaurantName ?? "G&M"} logoUrl={settings?.logoUrl ?? ""} />;
}

