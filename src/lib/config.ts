export const ALLOWED_ORIGINS = [
  'https://papervault.one',
  'https://www.papervault.one',
  'https://sellfast.now',
  'https://www.sellfast.now',
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

export const DASHBOARD_PASSWORD = process.env.ANALYTICS_PASSWORD || 'nos-analytics-2024';
export const RATE_LIMIT_MAX = 100; // per IP per minute
