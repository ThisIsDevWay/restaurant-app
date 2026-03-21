import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate } from "@/db/queries/settings";
import { ContornosClient } from "./ContornosClient";

export default async function ContornosPage() {
  const [contornosList, rateResult] = await Promise.all([
    getAllContornos(),
    getActiveRate(),
  ]);

  return (
    <ContornosClient
      contornos={contornosList}
      exchangeRate={rateResult?.rate ?? 0}
    />
  );
}
