const formatters = new Map<number, Intl.NumberFormat>();

function formatterFor(digits: number): Intl.NumberFormat {
  let formatter = formatters.get(digits);
  if (!formatter) {
    // No thousands separator: keeps numbers compact in tiles and tables.
    formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
    formatters.set(digits, formatter);
  }
  return formatter;
}

/** pt-BR number with a fixed number of decimals; `—` when there is no value. */
export function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return formatterFor(digits).format(value);
}
