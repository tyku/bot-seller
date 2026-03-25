/** Парсинг заголовка Cookie без зависимости cookie-parser */
export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  if (!header || typeof header !== 'string') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export const DEMO_DRAFT_ID_COOKIE = 'demo_draft_id';
export const DEMO_DRAFT_SECRET_COOKIE = 'demo_draft_secret';

export function buildSetCookieHeader(
  name: string,
  value: string,
  maxAgeSeconds: number,
  options: { secure: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearCookieHeader(
  name: string,
  options: { secure: boolean },
): string {
  const parts = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
