export interface ContornoSelection {
  id: string;
  name: string;
  removable: boolean;
  substituteContornoIds: string[];
}

export interface CatalogItem {
  id: string;
  name: string;
  categoryName: string;
  priceUsdCents: number;
  imageUrl: string | null;
  contornos: ContornoSelection[];
}

export interface SimpleItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
}

export interface DailyMenuClientProps {
  allItems: CatalogItem[];
  dailyItemIds: string[];
  allAdicionales: SimpleItem[];
  dailyAdicionalIds: string[];
  allBebidas: SimpleItem[];
  dailyBebidaIds: string[];
  allContornos: SimpleItem[];
  dailyContornoIds: string[];
  selectedDate: string;
  today: string;
}

export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLabel(dateStr: string, today: string): { label: string; badge: string | null } {
  const d = parseDateLocal(dateStr);
  const label = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  if (dateStr === today) return { label, badge: "Hoy" };
  const t = parseDateLocal(today);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === -1) return { label, badge: "Ayer" };
  if (diff === 1) return { label, badge: "Mañana" };
  return { label, badge: null };
}

export function shiftDate(dateStr: string, days: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
