/** Extract a section join code from scanned QR text or a pasted link. */
export function parseJoinCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromQuery =
      url.searchParams.get('code') ||
      url.searchParams.get('joinCode') ||
      url.searchParams.get('join_code');
    if (fromQuery?.trim()) return fromQuery.trim().toUpperCase();

    const pathMatch = url.pathname.match(/\/join\/([A-Za-z0-9-]+)/i);
    if (pathMatch?.[1]) return pathMatch[1].trim().toUpperCase();
  } catch {
    const queryMatch = text.match(/[?&](?:code|joinCode|join_code)=([^&#]+)/i);
    if (queryMatch?.[1]) {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    }
  }

  const cleaned = text.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z0-9]{4,24}$/.test(cleaned)) return cleaned;

  return cleaned.length >= 4 ? cleaned : null;
}
