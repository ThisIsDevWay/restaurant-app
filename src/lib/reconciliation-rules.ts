export const RECONCILIATION_MATCH_SUFFIX_LEN = 4;

/**
 * Extrae el sufijo normalizado de una referencia para conciliación.
 */
export function getReferenceSuffix(reference: string): string {
  return reference.trim().slice(-RECONCILIATION_MATCH_SUFFIX_LEN);
}
