/** pt-BR decimal comma, no thousands separator (keeps numbers compact in tiles). */
export function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}
