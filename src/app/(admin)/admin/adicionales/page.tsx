import { getAllAdicionales } from "@/db/queries/adicionales";
import { getActiveRate } from "@/db/queries/settings";
import { AdicionalesClient } from "./AdicionalesClient";

export default async function AdicionalesPage() {
  const [adicionalesList, rateResult] = await Promise.all([
    getAllAdicionales(),
    getActiveRate(),
  ]);

  return (
    <AdicionalesClient
      adicionales={adicionalesList}
      exchangeRate={rateResult?.rate ?? 0}
    />
  );
}
