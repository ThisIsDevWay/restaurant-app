import { fetchCheckoutSettings } from "@/actions/settings";
import { getSettings } from "@/db/queries/settings";
import { isMenuVisible, type StatusOverride } from "@/lib/utils/date";
import { ClosedScreen } from "@/components/public/menu/ClosedScreen";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
    const [settings, appSettings] = await Promise.all([
        fetchCheckoutSettings(),
        getSettings(),
    ]);

    // Bloquea el checkout cuando el restaurante está cerrado (mismo criterio que el menú).
    const visible = isMenuVisible(appSettings?.businessHours ?? null, {
        hideWhenClosed: appSettings?.hideMenuWhenClosed ?? false,
        preOpenMinutes: appSettings?.preOpenVisibilityMinutes ?? 0,
        statusOverride: (appSettings?.statusOverride ?? "auto") as StatusOverride,
    });

    if (!visible) {
        return (
            <ClosedScreen
                restaurantName={appSettings?.restaurantName}
                logoUrl={appSettings?.logoUrl}
                scheduleText={appSettings?.scheduleText}
                businessHours={appSettings?.businessHours ?? null}
                statusOverride={(appSettings?.statusOverride ?? "auto") as StatusOverride}
            />
        );
    }

    return <CheckoutClient initialSettings={settings} />;
}
