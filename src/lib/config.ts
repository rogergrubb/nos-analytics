// --- CORS: Exact domains only. No wildcard .vercel.app ---
export const ALLOWED_ORIGINS = [
  'https://papervault.one',
  'https://www.papervault.one',
  'https://braincandy.im',
  'https://www.braincandy.im',
  'https://fullsendai.com',
  'https://www.fullsendai.com',
  'https://numberoneson.us',
  'https://www.numberoneson.us',
  'https://analytics.numberoneson.us',
  'http://localhost:3000',
  'http://localhost:5173',
];

export const SITES = ['papervault', 'sellfast', 'braincandy', 'fullsend', 'numberoneson'] as const;
export type SiteId = (typeof SITES)[number];

export const SITE_LABELS: Record<string, string> = {
  papervault: 'PaperVault.one',
  sellfast: 'SellFast.now',
  braincandy: 'BrainCandy.im',
  fullsend: 'Full Send AI',
  numberoneson: 'numberoneson.us',
};

// --- Auth ---
export const DASHBOARD_PASSWORD = process.env.ANALYTICS_PASSWORD || 'nos-analytics-2024';
const SESSION_SECRET = process.env.SESSION_SECRET || DASHBOARD_PASSWORD + '-session-hmac';

export const RATE_LIMIT_MAX = 100; // per IP per minute

// --- Simple token-based sessions (no external crypto dependency) ---
// Uses a keyed hash approach that works in all runtimes

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Double hash with secret for basic HMAC-like behavior
  const combined = `${Math.abs(hash).toString(36)}-${str.length}`;
  let hash2 = 0;
  for (let i = 0; i < combined.length; i++) {
    hash2 = ((hash2 << 5) - hash2) + combined.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return Math.abs(hash).toString(36) + '.' + Math.abs(hash2).toString(36);
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    rnd: Math.random().toString(36).slice(2),
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = simpleHash(payloadB64 + SESSION_SECRET);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx < 1) return false;

    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const expectedSig = simpleHash(payloadB64 + SESSION_SECRET);
    if (sig !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}
