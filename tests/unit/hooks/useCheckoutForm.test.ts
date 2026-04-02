import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCheckoutForm } from "@/hooks/useCheckoutForm";
import type { CheckoutSettings } from "@/components/public/checkout/CheckoutForm.types";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSettings: CheckoutSettings = {
  rate: 36.50,
  orderModeOnSiteEnabled: true,
  orderModeTakeAwayEnabled: true,
  orderModeDeliveryEnabled: true,
  packagingFeePerPlateUsdCents: 200,
  packagingFeePerAdicionalUsdCents: 100,
  packagingFeePerBebidaUsdCents: 100,
  deliveryFeeUsdCents: 500,
  deliveryCoverage: "Zona norte",
  transferBankName: "Banesco",
  transferAccountName: "G&M",
  transferAccountNumber: "01341234567890123456",
  transferAccountRif: "J-12345678-9",
  paymentPagoMovilEnabled: true,
  paymentTransferEnabled: true,
};

const defaultProps = {
  isSubmitting: false,
  onSubmit: vi.fn(),
  settings: mockSettings,
};

describe("useCheckoutForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validatePhone", () => {
    it.each([
      ["04141234567", true],
      ["04241234567", true],
      ["04121234567", true],
      ["04161234567", true],
      ["04261234567", true],
      ["04131234567", false], // prefijo inválido
      ["0414123456", false],  // 10 dígitos
      ["041412345678", true],  // 12 digits → truncated to 11 → valid
      ["12345678901", false],  // sin prefijo válido
      ["", false],
    ])("valida %s → phoneValid=%s", (phone, expectedValid) => {
      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      // Simulate typing the phone number
      act(() => {
        const event = { target: { value: phone } } as React.ChangeEvent<HTMLInputElement>;
        result.current.handlePhoneChange(event);
      });

      expect(result.current.phoneValid).toBe(expectedValid);
    });
  });

  describe("lookupCustomer", () => {
    it("rellena name y cedula cuando found=true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ found: true, name: "Carlos Perez", cedula: "V-12345678" }),
      });

      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      // Type a valid phone
      act(() => {
        const event = { target: { value: "04141234567" } } as React.ChangeEvent<HTMLInputElement>;
        result.current.handlePhoneChange(event);
      });

      // Advance timer past debounce (400ms)
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      // Wait for the fetch to resolve
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/customers/lookup?phone=04141234567");
      });

      expect(result.current.name).toBe("Carlos Perez");
      expect(result.current.cedula).toBe("V-12345678");
      expect(result.current.isReturning).toBe(true);
      expect(result.current.customerFieldsVisible).toBe(true);
    });

    it("limpia campos cuando found=false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ found: false }),
      });

      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      act(() => {
        const event = { target: { value: "04141234567" } } as React.ChangeEvent<HTMLInputElement>;
        result.current.handlePhoneChange(event);
      });

      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(result.current.name).toBe("");
      expect(result.current.cedula).toBe("");
      expect(result.current.isReturning).toBe(false);
      expect(result.current.customerFieldsVisible).toBe(true);
    });
  });

  describe("debounce", () => {
    it("no llama lookup hasta 400ms después del último keystroke", async () => {
      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      // Type first 3 digits
      act(() => {
        result.current.handlePhoneChange({ target: { value: "041" } } as React.ChangeEvent<HTMLInputElement>);
      });

      // Advance 300ms — should NOT call yet
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // Type more (simulates debounce reset)
      act(() => {
        result.current.handlePhoneChange({ target: { value: "0414" } } as React.ChangeEvent<HTMLInputElement>);
      });

      // Advance 300ms again — still shouldn't call
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // Complete the phone number
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ found: false }),
      });

      act(() => {
        result.current.handlePhoneChange({ target: { value: "04141234567" } } as React.ChangeEvent<HTMLInputElement>);
      });

      // Advance 400ms after the last keystroke
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleSubmit", () => {
    it("no llama onSubmit si phone es inválido", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCheckoutForm({ ...defaultProps, onSubmit }));

      act(() => {
        result.current.handlePhoneChange({ target: { value: "123" } } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleSubmit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("llama onSubmit con datos correctos si phone es válido", async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCheckoutForm({ ...defaultProps, onSubmit }));

      // Set a valid phone
      act(() => {
        result.current.handlePhoneChange({ target: { value: "04141234567" } } as React.ChangeEvent<HTMLInputElement>);
      });

      // Wait for debounce to resolve (no lookup needed for submit test)
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      act(() => {
        result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith(
        "04141234567",
        "pago_movil",
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe("phone formatting", () => {
    it("formatea teléfono con espacios", () => {
      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      act(() => {
        result.current.handlePhoneChange({ target: { value: "04141234567" } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.getFormattedPhone()).toBe("0414 123 4567");
    });

    it("limita a 11 dígitos", () => {
      const { result } = renderHook(() => useCheckoutForm(defaultProps));

      act(() => {
        result.current.handlePhoneChange({ target: { value: "0414123456789" } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.phone).toBe("04141234567");
    });
  });
});
