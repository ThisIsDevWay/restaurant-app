"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  Printer,
  MoreHorizontal,
  Hash,
  Loader2,
  Phone,
  User,
  CreditCard,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ACTION_MAP,
  ACTION_ENDPOINTS,
  type OrderStatus,
  type ActionType,
} from "@/lib/constants/order-status";
import { cn } from "@/lib/utils";

const DETAIL_ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: any;
    variant: "default" | "destructive" | "outline" | "secondary";
    actionType: ActionType | "print";
  }
> = {
  confirm: {
    label: "Confirmar orden",
    icon: CheckCircle,
    variant: "default",
    actionType: "confirm",
  },
  confirm_manual: {
    label: "Confirmar pago",
    icon: CheckCircle,
    variant: "default",
    actionType: "confirm_manual",
  },
  confirm_with_ref: {
    label: "Confirmar con referencia",
    icon: CheckCircle,
    variant: "default",
    actionType: "confirm_with_ref",
  },
  mark_kitchen: {
    label: "Enviar a cocina",
    icon: ChefHat,
    variant: "default",
    actionType: "mark_kitchen",
  },
  mark_delivered: {
    label: "Marcar entregada",
    icon: Truck,
    variant: "default",
    actionType: "mark_delivered",
  },
  cancel: {
    label: "Cancelar orden",
    icon: XCircle,
    variant: "destructive",
    actionType: "cancel",
  },
  print: {
    label: "Imprimir ticket",
    icon: Printer,
    variant: "outline",
    actionType: "print",
  },
};

const DESTRUCTIVE_ACTIONS: Set<string> = new Set(["cancel"]);
const REFERENCE_ACTIONS: Set<string> = new Set(["confirm_with_ref"]);

interface RefFields {
  paymentReference: string;
  phone: string;
  customerName: string;
  cedula: string;
}

export function OrderActions({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: OrderStatus;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refFields, setRefFields] = useState<RefFields>({
    paymentReference: "",
    phone: "",
    customerName: "",
    cedula: "",
  });
  const [refErrors, setRefErrors] = useState<Partial<RefFields>>({});

  const quickActions = ACTION_MAP[orderStatus] ?? [];

  const mutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
      setConfirmKey(null);
      setRefDialogOpen(false);
    },
  });

  function handleAction(key: string) {
    if (key === "print") {
      window.print();
      return;
    }
    if (DESTRUCTIVE_ACTIONS.has(key)) {
      setConfirmKey(key);
      return;
    }
    if (REFERENCE_ACTIONS.has(key)) {
      setRefFields({ paymentReference: "", phone: "", customerName: "", cedula: "" });
      setRefErrors({});
      setRefDialogOpen(true);
      return;
    }
    const config = DETAIL_ACTION_CONFIG[key];
    if (config?.actionType && config.actionType !== "print") {
      mutation.mutate({ actionType: config.actionType as ActionType });
    }
  }

  function handleConfirmDestructive() {
    if (confirmKey) {
      const config = DETAIL_ACTION_CONFIG[confirmKey];
      if (config?.actionType && config.actionType !== "print") {
        mutation.mutate({ actionType: config.actionType as ActionType });
      }
    }
  }

  function validateRef(): boolean {
    const newErrors: Partial<RefFields> = {};
    if (refFields.paymentReference.trim().length < 3) {
      newErrors.paymentReference = "Mínimo 3 caracteres";
    }
    if (refFields.phone.trim().length < 7) {
      newErrors.phone = "Teléfono inválido (mínimo 7 dígitos)";
    }
    setRefErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleConfirmWithRef() {
    if (!validateRef()) return;
    mutation.mutate({ actionType: "confirm_with_ref", refPayload: refFields });
  }

  function setRefField(key: keyof RefFields, value: string) {
    setRefFields((f) => ({ ...f, [key]: value }));
    setRefErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (quickActions.length === 0) return null;

  const primaryQA = quickActions[0];
  const secondaryQAs = quickActions.slice(1);
  const primaryConfig = DETAIL_ACTION_CONFIG[primaryQA.action];

  return (
    <div className="flex items-center gap-3 flex-wrap" data-actions>
      {/* Primary Action Button */}
      {primaryConfig && (
        <Button
          size="lg"
          variant={primaryConfig.variant}
          className="rounded-xl px-8 font-bold shadow-sm"
          onClick={() => handleAction(primaryQA.action)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Actualizando...
            </div>
          ) : (
            <>
              <primaryConfig.icon className="h-5 w-5 mr-2" />
              {primaryConfig.label}
            </>
          )}
        </Button>
      )}

      {/* Secondary Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl px-4 text-text-muted"
              disabled={mutation.isPending}
            />
          }
        >
          <MoreHorizontal className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl overflow-hidden shadow-xl border-border/60 p-1.5">
          <DropdownMenuItem
            className="rounded-lg h-10 font-medium cursor-pointer"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2 text-text-muted" />
            Imprimir Ticket
          </DropdownMenuItem>

          {secondaryQAs.length > 0 && <DropdownMenuSeparator className="my-1.5 opacity-50" />}

          {secondaryQAs.map((qa) => {
            const config = DETAIL_ACTION_CONFIG[qa.action];
            if (!config) return null;
            const isDestructive = DESTRUCTIVE_ACTIONS.has(qa.action);
            return (
              <DropdownMenuItem
                key={qa.action}
                className={cn(
                  "rounded-lg h-10 font-medium cursor-pointer",
                  isDestructive ? "text-red-600 focus:text-red-700 focus:bg-red-50" : ""
                )}
                onClick={() => handleAction(qa.action)}
              >
                <config.icon className={cn("h-4 w-4 mr-2", isDestructive ? "text-red-500" : "text-text-muted")} />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={confirmKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmKey(null);
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancelar orden</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. ¿Estás seguro de que deseas cancelar esta orden?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmKey(null)}
              className="rounded-xl"
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDestructive}
              disabled={mutation.isPending}
              className="rounded-xl font-bold"
            >
              {mutation.isPending ? "Procesando..." : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reference Dialog for pending → paid */}
      <Dialog
        open={refDialogOpen}
        onOpenChange={(open) => {
          if (!open) setRefDialogOpen(false);
        }}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              Confirmar pago pendiente
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos del pago para confirmar la orden y registrarla en auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <RefField
              label="Número de referencia *"
              placeholder="Ej: 36785432198"
              value={refFields.paymentReference}
              error={refErrors.paymentReference}
              icon={<Hash className="h-3.5 w-3.5" />}
              mono
              autoFocus
              onChange={(v) => setRefField("paymentReference", v)}
            />
            <RefField
              label="Teléfono del pagador *"
              placeholder="Ej: 04121234567"
              value={refFields.phone}
              error={refErrors.phone}
              icon={<Phone className="h-3.5 w-3.5" />}
              mono
              onChange={(v) => setRefField("phone", v)}
            />
            <RefField
              label="Nombre (opcional)"
              placeholder="Ej: Juan García"
              value={refFields.customerName}
              icon={<User className="h-3.5 w-3.5" />}
              onChange={(v) => setRefField("customerName", v)}
            />
            <RefField
              label="Cédula (opcional)"
              placeholder="Ej: V-12345678"
              value={refFields.cedula}
              icon={<CreditCard className="h-3.5 w-3.5" />}
              mono
              onChange={(v) => setRefField("cedula", v)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRefDialogOpen(false)}
              className="rounded-xl"
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmWithRef}
              disabled={
                mutation.isPending ||
                refFields.paymentReference.trim().length < 3 ||
                refFields.phone.trim().length < 7
              }
              className="rounded-xl font-bold"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirmando...</>
              ) : (
                "Confirmar pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RefField({
  label,
  placeholder,
  value,
  error,
  icon,
  mono = false,
  autoFocus = false,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  icon?: React.ReactNode;
  mono?: boolean;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? "font-mono text-sm" : "text-sm"}
        autoFocus={autoFocus}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
