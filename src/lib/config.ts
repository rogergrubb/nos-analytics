import { createHmac } from 'crypto';

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

// --- HMAC Session Tokens (replaces base64 plaintext) ---

export function createSessionToken(): string {
  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;

    const expectedSig = createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    if (sig !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}
