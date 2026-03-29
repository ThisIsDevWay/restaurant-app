import { fetchCheckoutSettings } from "@/actions/settings";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
    const settings = await fetchCheckoutSettings();

    return <CheckoutClient initialSettings={settings} />;
}
