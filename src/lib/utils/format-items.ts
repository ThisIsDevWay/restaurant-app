type ItemWithName = { name: string; quantity?: number };

export function formatItems(items: ItemWithName[] | null | undefined, maxVisible = 1): string {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const first = items[0].name;
  const rest = items.length - maxVisible;
  if (rest <= 0) return first;
  return `${first} +${rest} más`;
}
