"use client";

import { useState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import type { SettingsFormData, FormErrors, PaymentProvider } from "@/app/(admin)/admin/settings/SettingsForm.types";

export interface UseSettingsFormParams {
  initialData: SettingsFormData | null;
}

export interface UseSettingsFormReturn {
  form: SettingsFormData;
  setForm: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
  isSaving: boolean;
  message: { type: "success" | "error"; text: string } | null;
  errors: FormErrors;
  decimalInputs: Record<string, string>;
  setDecimalInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const DEFAULT_FORM: SettingsFormData = {
  bankName: "",
  bankCode: "",
  restaurantName: "G&M",
  accountPhone: "",
  accountRif: "",
  transferBankName: "",
  transferAccountName: "",
  transferAccountNumber: "",
  transferAccountRif: "",
  adicionalesEnabled: true,
  bebidasEnabled: true,
  bncApiKey: "",
  orderExpirationMinutes: 30,
  maxPendingOrders: 99,
  maxQuantityPerItem: 10,
  rateCurrency: "usd",
  showRateInMenu: true,
  rateOverrideBsPerUsd: "",
  activePaymentProvider: "banesco_reference" as PaymentProvider,
  banescoApiKey: "",
  mercantilClientId: "",
  mercantilClientSecret: "",
  mercantilSecretKey: "",
  mercantilMerchantId: "",
  mercantilIntegratorId: "",
  mercantilTerminalId: "",
  whatsappNumber: "",
  whatsappMicroserviceUrl: "",
  instagramUrl: "",
  logoUrl: "",
  coverImageUrl: "",
  branchName: "",
  scheduleText: "",
  orderModeOnSiteEnabled: true,
  orderModeTakeAwayEnabled: true,
  orderModeDeliveryEnabled: true,
  packagingFeePerPlateUsdCents: 0,
  packagingFeePerAdicionalUsdCents: 0,
  packagingFeePerBebidaUsdCents: 0,
  deliveryFeeUsdCents: 0,
  deliveryCoverage: "",
  paymentPagoMovilEnabled: true,
  paymentTransferEnabled: true,
  menuLayout: "modern",
  menuItemSortMode: "custom",
};

export function useSettingsForm({ initialData }: UseSettingsFormParams): UseSettingsFormReturn {
  const [form, setForm] = useState<SettingsFormData>(initialData ?? DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [decimalInputs, setDecimalInputs] = useState<Record<string, string>>(() => {
    const data = (initialData ?? {}) as Partial<SettingsFormData>;
    return {
      packagingFeePerPlateUsdCents: data.packagingFeePerPlateUsdCents ? (data.packagingFeePerPlateUsdCents / 100).toString() : "0",
      packagingFeePerAdicionalUsdCents: data.packagingFeePerAdicionalUsdCents ? (data.packagingFeePerAdicionalUsdCents / 100).toString() : "0",
      packagingFeePerBebidaUsdCents: data.packagingFeePerBebidaUsdCents ? (data.packagingFeePerBebidaUsdCents / 100).toString() : "0",
      deliveryFeeUsdCents: data.deliveryFeeUsdCents ? (data.deliveryFeeUsdCents / 100).toString() : "0",
    };
  });

  function updateField<K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.restaurantName.trim()) e.restaurantName = "Nombre del restaurante requerido";
    if (!form.bankName.trim()) e.bankName = "Nombre del banco requerido";
    if (!form.bankCode.trim()) e.bankCode = "Código del banco requerido";
    if (!form.accountPhone.trim()) e.accountPhone = "Teléfono requerido";
    if (!form.accountRif.trim()) e.accountRif = "RIF requerido";
    if (form.orderExpirationMinutes < 1) e.orderExpirationMinutes = "Mínimo 1 minuto";
    if (form.maxPendingOrders < 1) e.maxPendingOrders = "Mínimo 1";
    if (form.maxQuantityPerItem < 1) e.maxQuantityPerItem = "Mínimo 1";
    if (form.rateOverrideBsPerUsd && (isNaN(parseFloat(form.rateOverrideBsPerUsd)) || parseFloat(form.rateOverrideBsPerUsd) <= 0)) {
      e.rateOverrideBsPerUsd = "Tasa inválida";
    }
    if (form.activePaymentProvider === "whatsapp_manual" && !form.whatsappNumber.trim()) {
      e.whatsappNumber = "Número de WhatsApp requerido para este modo";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setMessage(null);

    // The settingsSchema expects rateOverrideBsPerUsd as optional string.
    // Convert empty string to undefined to match the schema.
    const submitData = {
      ...form,
      rateOverrideBsPerUsd: form.rateOverrideBsPerUsd || undefined,
    };

    const result = await saveSettingsAction(submitData);

    if (result?.data?.success) {
      setMessage({ type: "success", text: "Configuración guardada" });
    } else {
      setMessage({ type: "error", text: result?.data?.error || result?.serverError || "Error al guardar configuración" });
    }

    setIsSaving(false);
  };

  return {
    form,
    setForm,
    updateField,
    isSaving,
    message,
    errors,
    decimalInputs,
    setDecimalInputs,
    handleSubmit,
  };
}
