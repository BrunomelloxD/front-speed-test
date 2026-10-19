/** Decimal megabits per second (AD-003): bytes × 8 / seconds / 1e6. */
export function toMbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0;
  return (bytes * 8) / (ms / 1000) / 1e6;
}
