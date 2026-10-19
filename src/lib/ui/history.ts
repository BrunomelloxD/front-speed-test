/** History rows minus the one waiting for "Desfazer" (it is still on the server). */
export function withoutPending<T extends { id: string }>(list: T[], pendingId: string | null): T[] {
  return pendingId === null ? list : list.filter((item) => item.id !== pendingId);
}

/** Undo: put the row back at its old position, never twice. */
export function restoreAt<T extends { id: string }>(list: T[], item: T, index: number): T[] {
  if (list.some((existing) => existing.id === item.id)) return list;
  const at = Math.min(index, list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}
