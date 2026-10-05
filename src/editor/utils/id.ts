let counter = 0;

/** Short unique id. Uses crypto when available (all modern browsers). */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  counter += 1;
  return `${prefix}_${random}${counter.toString(36)}`;
}
