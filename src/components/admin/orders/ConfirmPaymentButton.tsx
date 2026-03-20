"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function ConfirmPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm-manual`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleConfirm}
      disabled={loading}
      className="bg-price-green text-white hover:bg-price-green/80"
    >
      <Check className="mr-1 h-3.5 w-3.5" />
      {loading ? "Confirmando..." : "Confirmar pago"}
    </Button>
  );
}
