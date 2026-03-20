const PROVIDER_LABELS: Record<string, { name: string }> = {
  banesco_reference: { name: "Banesco" },
  "banesco-reference": { name: "Banesco" },
  "whatsapp-manual": { name: "WhatsApp Manual" },
  whatsapp_manual: { name: "WhatsApp Manual" },
  mercantil_c2p: { name: "Pago Móvil C2P" },
  "mercantil-c2p": { name: "Pago Móvil C2P" },
  c2p: { name: "Pago Móvil C2P" },
  bnc_feed: { name: "BNC" },
  "bnc-feed": { name: "BNC" },
  bnc: { name: "BNC" },
};

export function formatProvider(slug: string | null | undefined): string {
  if (!slug) return "Desconocido";
  return PROVIDER_LABELS[slug.toLowerCase()]?.name ?? slug;
}
