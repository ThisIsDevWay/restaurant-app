import { getSettings } from "@/db/queries/settings";
import { LoginForm } from "./LoginForm";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSettings();
  return (
    <Suspense fallback={null}>
      <LoginForm restaurantName={settings?.restaurantName ?? "G&M"} logoUrl={settings?.logoUrl ?? ""} />
    </Suspense>
  );
}
