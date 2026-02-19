# NOS Analytics

Unified analytics for NumberOneSon Software's product portfolio.

## Quick Start

### 1. Deploy to Vercel

```bash
cd nos-analytics
npm install
vercel
```

### 2. Add Vercel KV

Go to your Vercel project → Storage → Create KV Database. Environment variables are auto-populated.

### 3. Set Dashboard Password

Add `ANALYTICS_PASSWORD` to your Vercel environment variables.

### 4. Configure Domain

Add `analytics.numberoneson.us` as a custom domain in Vercel project settings.

### 5. Add Tracker to Your Sites

```html
<!-- PaperVault.one -->
<script src="https://analytics.numberoneson.us/t.js" data-site="papervault"></script>

<!-- SellFast.now -->
<script src="https://analytics.numberoneson.us/t.js" data-site="sellfast"></script>

<!-- BrainCandy.im -->
<script src="https://analytics.numberoneson.us/t.js" data-site="braincandy"></script>

<!-- Full Send AI -->
<script src="https://analytics.numberoneson.us/t.js" data-site="fullsendai"></script>

<!-- numberoneson.us -->
<script src="https://analytics.numberoneson.us/t.js" data-site="numberoneson"></script>
```

## Tracking Custom Events

The tracker exposes a `nosAnalytics` global:

```js
// Track signup conversion
nosAnalytics.track('signup', { plan: 'pro' });

// Track payment conversion
nosAnalytics.track('paid', { amount: 29 });

// Track any custom event
nosAnalytics.track('feature_used', { feature: 'export' });

// Associate with a user (updates fingerprint)
nosAnalytics.identify('user-123');
```

## CTA Click Tracking

Add `data-track` to any element:

```html
<button data-track="hero-cta">Get Started</button>
<a href="/pricing" data-track="pricing-link">View Pricing</a>
```

All external links (`<a href="http...">`) are auto-tracked.

## Dashboard

Visit `https://analytics.numberoneson.us` and enter your password.

Features:
- Real-time visitor counts per site
- Traffic charts (hourly/daily)
- Geographic breakdown (country + city)
- Top pages and referrers
- UTM campaign performance
- Device/browser/OS breakdown
- Conversion funnel (visit → signup → paid)
- Site selector or aggregate view

## Architecture

- **Tracker** (`/t.js`): ~2KB vanilla JS, no cookies, beacon API
- **API** (`/api/collect`): Receives events, geo-enriches via ip-api.com, stores in Vercel KV
- **Dashboard** (`/`): React + Recharts, auto-refreshes every 60s
- **Storage**: Vercel KV (Redis) with 90-day TTL, HyperLogLog for unique visitors

## Privacy

- No cookies — uses a lightweight fingerprint (screen size + timezone + language hash)
- No PII stored — IP used only for geo lookup, not persisted in raw form
- 90-day data retention
- Rate limited (100 req/min per IP)
