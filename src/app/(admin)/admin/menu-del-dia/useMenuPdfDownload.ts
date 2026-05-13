"use client";

import { useState, useCallback } from "react";
import { fetchMenuPdfData, type MenuPdfData } from "./actions/generateMenuPdf";

type PdfState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; previewUrl: string; blob: Blob; data: MenuPdfData }
  | { status: "error"; message: string };

export function useMenuPdfDownload(selectedDate: string) {
  const [state, setState] = useState<PdfState>({ status: "idle" });

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await fetchMenuPdfData(selectedDate);

      if (data.priceTiers.length === 0) {
        setState({ status: "error", message: "No hay platos activos para esta fecha." });
        return;
      }

      // Dynamic import to avoid loading jsPDF in the main bundle
      const { generateMenuPdf } = await import("@/lib/menu-pdf-builder");
      const blob = await generateMenuPdf(data);
      const previewUrl = URL.createObjectURL(blob);

      setState({ status: "ready", previewUrl, blob, data });
    } catch (err) {
      console.error("Error generating PDF:", err);
      setState({ status: "error", message: "Error al generar el PDF." });
    }
  }, [selectedDate]);

  const download = useCallback(() => {
    if (state.status !== "ready") return;
    const link = document.createElement("a");
    link.href = state.previewUrl;
    link.download = `menu-del-dia-${selectedDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state, selectedDate]);

  const reset = useCallback(() => {
    if (state.status === "ready") {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ status: "idle" });
  }, [state]);

  return { state, generate, download, reset };
}
