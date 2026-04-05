/**
 * Tests unitarios para la validacion de imagenes en useMenuItemForm.
 *
 * Verifica:
 * - Rechazo de tipos de archivo no soportados
 * - Rechazo de archivos mayores a 5MB
 * - Aceptacion de tipos validos (JPEG, PNG, WebP)
 * - handleRemoveImage limpia imageUrl y previewUrl
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Mocks BEFORE importing the hook ─────────────────────────────────────────

const mockGenerateUploadUrl = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/actions/menu", () => ({
  createMenuItemAction: vi.fn(),
  updateMenuItemAction: vi.fn(),
  deleteMenuItemAction: vi.fn(),
  generateUploadUrlAction: (...args: unknown[]) => mockGenerateUploadUrl(...args),
  getPublicUrlAction: (...args: unknown[]) => mockGetPublicUrl(...args),
}));

vi.mock("@/actions/adicionales", () => ({
  saveMenuItemAdicionalesAction: vi.fn(),
}));

vi.mock("@/actions/contornos", () => ({
  saveMenuItemContornosAction: vi.fn(),
}));

vi.mock("@/actions/bebidas", () => ({
  saveMenuItemBebidasAction: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useMenuItemForm } from "@/hooks/useMenuItemForm";

const defaultParams = {
  categories: [
    { id: "cat-1", name: "Platos Fuertes", allowAlone: true, isSimple: false, isAvailable: true, sortOrder: 0 },
  ],
  initialData: undefined,
  exchangeRate: 451.507,
  initialSelectedAdicionalIds: [],
  initialSelectedContornos: [],
  initialSelectedBebidaIds: [],
};

function createMockFile(name: string, type: string, sizeBytes: number): File {
  // File constructor ignores the 'size' option — we must create content of the right length
  const content = new ArrayBuffer(sizeBytes);
  return new File([content], name, { type });
}

function setupUploadMocks() {
  mockGenerateUploadUrl.mockResolvedValue({
    data: { success: true, url: "https://example.com/upload", path: "menu/test.jpg" },
  });
  mockGetPublicUrl.mockResolvedValue({
    data: "https://example.com/menu/test.jpg",
  });
  mockFetch.mockResolvedValue({ ok: true });
}

describe("useMenuItemForm — image validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUploadMocks();
  });

  describe("handleImageUpload — type validation", () => {
    it("rechaza archivos con tipo no soportado (image/gif)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const gifFile = createMockFile("test.gif", "image/gif", 1024);

      await act(async () => {
        await result.current.handleImageUpload(gifFile);
      });

      expect(result.current.error).toBe("Formato no soportado. Usa JPG, PNG o WebP.");
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it("rechaza archivos con tipo no soportado (image/bmp)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const bmpFile = createMockFile("test.bmp", "image/bmp", 1024);

      await act(async () => {
        await result.current.handleImageUpload(bmpFile);
      });

      expect(result.current.error).toBe("Formato no soportado. Usa JPG, PNG o WebP.");
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it("rechaza archivos con tipo no soportado (image/svg+xml)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const svgFile = createMockFile("test.svg", "image/svg+xml", 1024);

      await act(async () => {
        await result.current.handleImageUpload(svgFile);
      });

      expect(result.current.error).toBe("Formato no soportado. Usa JPG, PNG o WebP.");
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it("acepta archivos JPEG (image/jpeg)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const jpegFile = createMockFile("test.jpg", "image/jpeg", 1024);

      await act(async () => {
        await result.current.handleImageUpload(jpegFile);
      });

      expect(result.current.error).toBeNull();
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
    });

    it("acepta archivos PNG (image/png)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const pngFile = createMockFile("test.png", "image/png", 1024);

      await act(async () => {
        await result.current.handleImageUpload(pngFile);
      });

      expect(result.current.error).toBeNull();
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
    });

    it("acepta archivos WebP (image/webp)", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const webpFile = createMockFile("test.webp", "image/webp", 1024);

      await act(async () => {
        await result.current.handleImageUpload(webpFile);
      });

      expect(result.current.error).toBeNull();
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
    });
  });

  describe("handleImageUpload — size validation", () => {
    it("rechaza archivos mayores a 5MB", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      // 5MB + 1 byte
      const largeFile = createMockFile("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1);

      await act(async () => {
        await result.current.handleImageUpload(largeFile);
      });

      expect(result.current.error).toBe("Imagen demasiado grande. Máximo 5MB.");
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it("acepta archivos de exactamente 5MB", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const exactFile = createMockFile("exact.jpg", "image/jpeg", 5 * 1024 * 1024);

      await act(async () => {
        await result.current.handleImageUpload(exactFile);
      });

      expect(result.current.error).toBeNull();
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
    });

    it("acepta archivos menores a 5MB", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const smallFile = createMockFile("small.jpg", "image/jpeg", 1024 * 1024); // 1MB

      await act(async () => {
        await result.current.handleImageUpload(smallFile);
      });

      expect(result.current.error).toBeNull();
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
    });
  });

  describe("handleRemoveImage", () => {
    it("limpia imageUrl del form y previewUrl", () => {
      const { result } = renderHook(() => useMenuItemForm({
        ...defaultParams,
        initialData: {
          id: "item-1",
          name: "Test Item",
          description: "Test",
          categoryId: "cat-1",
          priceUsdCents: 1000,
          costUsdCents: 500,
          costUpdatedAt: new Date(),
          isAvailable: true,
          imageUrl: "https://example.com/existing.jpg",
          sortOrder: 0,
        },
      }));

      // Verify initial state has the image
      expect(result.current.previewUrl).toBe("https://example.com/existing.jpg");
      expect(result.current.watch("imageUrl")).toBe("https://example.com/existing.jpg");

      // Remove image
      act(() => {
        result.current.handleRemoveImage();
      });

      expect(result.current.previewUrl).toBeNull();
      expect(result.current.watch("imageUrl")).toBe("");
    });
  });

  describe("handleImageUpload — no file provided", () => {
    it("does nothing when file is undefined from input event", async () => {
      const { result } = renderHook(() => useMenuItemForm(defaultParams));

      const mockEvent = {
        target: { files: undefined },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImageUpload(mockEvent);
      });

      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });
});
