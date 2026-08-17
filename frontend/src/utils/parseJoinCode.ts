/** Extract a section join code from scanned QR text or a pasted link. */
export function parseJoinCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('code');
    if (fromQuery?.trim()) return fromQuery.trim().toUpperCase();
  } catch {
    const queryMatch = text.match(/[?&]code=([^&#]+)/i);
    if (queryMatch?.[1]) {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    }
  }

  const cleaned = text.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z0-9]{4,24}$/.test(cleaned)) return cleaned;

  return cleaned.length >= 4 ? cleaned : null;
}
