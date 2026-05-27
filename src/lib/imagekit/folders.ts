export const IMAGEKIT_FOLDERS = {
  menu: "menu",
  branding: "branding",
  comprobantes: (orderId: string) => `comprobantes/orders/${orderId}`,
  tvMedia: () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `tv-media/${year}/${month}`;
  },
} as const;
