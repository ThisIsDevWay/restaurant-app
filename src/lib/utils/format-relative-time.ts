export function formatOrderTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `hace ${diffHr} ${diffHr === 1 ? "hora" : "horas"}`;
  }

  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}
