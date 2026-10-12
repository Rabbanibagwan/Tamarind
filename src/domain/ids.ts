let seq = 0;

export function createId(prefix: string): string {
  seq += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}_${seq}`;
}
