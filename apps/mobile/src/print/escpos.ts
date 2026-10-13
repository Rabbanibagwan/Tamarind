/** Minimal ESC/POS helpers for 58/80mm thermal printers. */

const ESC = 0x1b;
const GS = 0x1d;

export function encodeText(lines: string[]): Uint8Array {
  const chunks: number[] = [];
  // Initialize
  chunks.push(ESC, 0x40);
  // Align left
  chunks.push(ESC, 0x61, 0x00);
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      chunks.push(line.charCodeAt(i) & 0xff);
    }
    chunks.push(0x0a);
  }
  // Feed + partial cut
  chunks.push(0x0a, 0x0a, 0x0a);
  chunks.push(GS, 0x56, 0x00);
  return Uint8Array.from(chunks);
}

export function formatSlipLines(opts: {
  merchantName: string;
  title: string;
  documentId: string;
  body: string[];
  reprint?: boolean;
}): string[] {
  return [
    opts.merchantName,
    "------------------------",
    opts.title,
    opts.reprint ? "(REPRINT)" : "",
    `Ref: ${opts.documentId}`,
    "------------------------",
    ...opts.body,
    "------------------------",
    "Thank you",
  ].filter((l) => l !== "");
}
