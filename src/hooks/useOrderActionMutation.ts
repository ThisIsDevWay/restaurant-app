import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ACTION_ENDPOINTS, type ActionType } from "@/lib/constants/order-status";
import { toast } from "sonner";

interface RefFields {
  paymentReference: string;
  phone: string;
  customerName: string;
  cedula: string;
}

interface UseOrderActionMutationProps {
  orderId: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function useOrderActionMutation({
  orderId,
  onSuccess,
  onError,
}: UseOrderActionMutationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionType,
      refPayload,
    }: {
      actionType: ActionType;
      refPayload?: RefFields;
    }) => {
      const config = ACTION_ENDPOINTS[actionType];
      const url = config.url(orderId);
      const body =
        actionType === "confirm_with_ref" && refPayload
          ? {
              paymentReference: refPayload.paymentReference,
              phone: refPayload.phone,
              customerName: refPayload.customerName || undefined,
              cedula: refPayload.cedula || undefined,
            }
          : config.body
            ? config.body(orderId)
            : {};

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar la orden");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      router.refresh();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al actualizar la orden");
      if (onError) onError(err);
    },
  });
}
