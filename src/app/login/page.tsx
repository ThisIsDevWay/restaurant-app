import { getSettings } from "@/db/queries/settings";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const settings = await getSettings();
  return <LoginForm restaurantName={settings?.restaurantName ?? "G&M"} />;
}
