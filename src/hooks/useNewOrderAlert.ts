"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface AlertableOrder {
  id: string;
  orderNumber: number;
}

/**
 * Avisa (toast + sonido) cuando entra un pedido web nuevo mientras se trabaja
 * en caja. Pensado para alimentarse de la lista de pedidos web pendientes que
 * se mantiene viva por Supabase Realtime.
 *
 * Anti-falsas-alertas: en la primera población con datos sembramos los ids ya
 * vistos SIN alertar, de modo que los pedidos presentes al cargar/hidratar la
 * página no disparen una cascada de toasts y sonidos. A partir de ahí, cada id
 * nuevo emite una alerta.
 */
export function useNewOrderAlert(pendingOrders: AlertableOrder[]) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstPopulation = useRef(true);

  useEffect(() => {
    if (isFirstPopulation.current) {
      // La primera vez marcamos lo que ya existe como visto, sin alertar.
      // (Si arrancamos en cero, igual desactivamos el flag para recibir
      //  alertas directas en cuanto llegue el primer pedido.)
      seenIdsRef.current = new Set(pendingOrders.map((o) => o.id));
      isFirstPopulation.current = false;
      return;
    }

    for (const order of pendingOrders) {
      if (seenIdsRef.current.has(order.id)) continue;
      seenIdsRef.current.add(order.id);

      toast.info(`Nuevo pedido web #${order.orderNumber}`, {
        description: "Por favor verifica el pago.",
        duration: 6000,
      });

      playChime();
    }
  }, [pendingOrders]);
}

/**
 * Chime corto de dos notas sintetizado con la Web Audio API — evita shippear
 * un binario. Degrada en silencio si el navegador bloquea el AudioContext.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    playNote(659.25, now, 0.3); // E5 (ding)
    playNote(880.0, now + 0.12, 0.5); // A5 (dong)

    // Cerrar el contexto cuando el sonido termine para no acumular instancias.
    window.setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // Silencio: políticas de autoplay u otros errores no deben romper la UI.
  }
}
