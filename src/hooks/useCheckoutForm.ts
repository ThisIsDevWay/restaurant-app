"use client";

import { useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethod, OrderMode, CheckoutSettings, GpsCoords } from "@/components/public/checkout/CheckoutForm.types";
import type { SurchargeResult } from "@/hooks/useCheckoutSurcharges";

export interface UseCheckoutFormParams {
  isSubmitting: boolean;
  onSubmit: (phone: string, paymentMethod: PaymentMethod, name?: string, cedula?: string, orderMode?: OrderMode, deliveryAddress?: string, clientSurcharges?: SurchargeResult, gpsCoords?: GpsCoords | null) => void;
  settings: CheckoutSettings | null;
}

export interface UseCheckoutFormReturn {
  phone: string;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  cedula: string;
  setCedula: React.Dispatch<React.SetStateAction<string>>;
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  orderMode: OrderMode | null;
  setOrderMode: React.Dispatch<React.SetStateAction<OrderMode | null>>;
  deliveryAddress: string;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<string>>;
  summaryExpanded: boolean;
  onToggleSummary: () => void;
  envasesExpanded: boolean;
  setEnvasesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  customerFieldsVisible: boolean;
  isReturning: boolean;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getFormattedPhone: () => string;
  phoneValid: boolean;
  handleSubmit: (e?: React.FormEvent) => void;
  surchargesRef: MutableRefObject<SurchargeResult | null>;
  orderModeSelected: boolean;
  gpsCoords: GpsCoords | null;
  setGpsCoords: React.Dispatch<React.SetStateAction<GpsCoords | null>>;
}

export function useCheckoutForm({
  isSubmitting,
  onSubmit,
  settings,
}: UseCheckoutFormParams): UseCheckoutFormReturn {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings?.paymentPagoMovilEnabled !== false ? "pago_movil" : "transfer"
  );
  const [orderMode, setOrderMode] = useState<OrderMode | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [envasesExpanded, setEnvasesExpanded] = useState(false);
  const [customerFieldsVisible, setCustomerFieldsVisible] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surchargesRef = useRef<SurchargeResult | null>(null);

  // ✅ M2: Expand by default if first time
  useEffect(() => {
    const seen = localStorage.getItem("portillos_checkout_summary_seen");
    if (!seen) {
      setSummaryExpanded(true);
    }
  }, []);

  // ✅ M2: Save "seen" flag when collapsing
  const toggleSummary = useCallback(() => {
    setSummaryExpanded((prev) => {
      if (prev === true) {
        localStorage.setItem("portillos_checkout_summary_seen", "true");
      }
      return !prev;
    });
  }, []);

  function validatePhone(value: string): string | null {
    if (!/^(0414|0424|0412|0416|0426)\d{7}$/.test(value)) {
      return "Número de teléfono venezolano inválido";
    }
    return null;
  }

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phoneNumber}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.found) {
        setName(data.name ?? "");
        setCedula(data.cedula ?? "");
        setIsReturning(true);
      } else {
        setName("");
        setCedula("");
        setIsReturning(false);
      }
      setCustomerFieldsVisible(true);
    } catch {
      setCustomerFieldsVisible(true);
    }
  }, []);

  // Format phone automatically like 0414 123 4567
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    setPhone(val);
  };

  const getFormattedPhone = () => {
    if (phone.length > 7) return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    if (phone.length > 4) return `${phone.slice(0, 4)} ${phone.slice(4)}`;
    return phone;
  };

  // Debounced customer lookup
  useEffect(() => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);

    if (phone.length === 11 && validatePhone(phone) === null) {
      lookupTimeout.current = setTimeout(() => lookupCustomer(phone), 400);
    } else {
      setCustomerFieldsVisible(false);
      setIsReturning(false);
      setName("");
      setCedula("");
    }

    return () => {
      if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    };
  }, [phone, lookupCustomer]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderMode) return;
    
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      document.getElementById('phone-input')?.focus();
      return;
    }

    if (!name.trim()) {
      document.getElementById('name-input')?.focus();
      return;
    }

    if (!cedula.trim()) {
      document.getElementById('cedula-input')?.focus();
      return;
    }

    onSubmit(
      phone,
      paymentMethod,
      name.trim(),
      cedula.trim(),
      orderMode,
      deliveryAddress.trim() || undefined,
      surchargesRef.current ?? undefined,
      gpsCoords
    );
  };

  const phoneValid = phone.length === 11 && validatePhone(phone) === null;

  return {
    phone,
    name,
    setName,
    cedula,
    setCedula,
    paymentMethod,
    setPaymentMethod,
    orderMode,
    setOrderMode,
    deliveryAddress,
    setDeliveryAddress,
    summaryExpanded,
    onToggleSummary: toggleSummary,
    envasesExpanded,
    setEnvasesExpanded,
    customerFieldsVisible,
    isReturning,
    handlePhoneChange,
    getFormattedPhone,
    phoneValid,
    handleSubmit,
    surchargesRef,
    orderModeSelected: orderMode !== null,
    gpsCoords,
    setGpsCoords,
  };
}
