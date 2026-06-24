"use client";

import { useState, useEffect } from "react";

export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // El teclado se considera abierto si la altura visual es menor que el 85% de la altura total
      const isMobileKeyboard = viewport.height < window.innerHeight * 0.85;
      setIsKeyboardOpen(isMobileKeyboard);

      const heightDiff = window.innerHeight - viewport.height;
      // Solo consideramos altura de teclado si la diferencia supera los 100px para evitar falsos positivos
      setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        // En navegadores que no reaccionan al viewport instantáneamente, forzamos true
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      // Retraso mínimo para permitir que el foco salte de un input a otro sin cerrar transitoriamente
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || (activeEl.tagName !== "INPUT" && activeEl.tagName !== "TEXTAREA")) {
          // Si el viewport no dice lo contrario, cerramos
          const viewport = window.visualViewport;
          if (viewport) {
            const isMobileKeyboard = viewport.height < window.innerHeight * 0.85;
            setIsKeyboardOpen(isMobileKeyboard);
            if (!isMobileKeyboard) {
              setKeyboardHeight(0);
            }
          } else {
            setIsKeyboardOpen(false);
            setKeyboardHeight(0);
          }
        }
      }, 50);
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", handleViewportChange);
      viewport.addEventListener("scroll", handleViewportChange);
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    // Ejecutar chequeo inicial
    handleViewportChange();

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", handleViewportChange);
        viewport.removeEventListener("scroll", handleViewportChange);
      }
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
}
