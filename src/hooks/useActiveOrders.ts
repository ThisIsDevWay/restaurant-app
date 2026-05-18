import { useQuery } from "@tanstack/react-query";

async function fetchActiveOrders(): Promise<any[]> {
  const res = await fetch("/api/active-orders");
  if (!res.ok) throw new Error("Failed to fetch active orders");
  return res.json();
}

/**
 * Órdenes activas del día con refresco automático, para que los paneles de
 * /waiter y /caja muestren los pedidos de los meseros casi en tiempo real.
 */
export function useActiveOrders(initialData: any[]) {
  return useQuery({
    queryKey: ["active-orders"],
    queryFn: fetchActiveOrders,
    refetchInterval: 8000,
    initialData,
  });
}
