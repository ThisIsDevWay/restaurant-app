import { getMenuWithOptions } from "@/db/queries/menu";
import MenuCatalogView from "./MenuCatalogView";

export default async function MenuAdminPage() {
  const items = await getMenuWithOptions();
  return <MenuCatalogView items={items} />;
}