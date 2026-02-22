# Agent Memory – NOS Analytics

## 1. Project Overview
- **What**: Unified analytics dashboard for NumberOneSon Software's 5-website portfolio
- **Sites tracked**: PaperVault.one, SellFast.now, BrainCandy.im, Full Send AI (fullsendai.com), numberoneson.us
- **Stack**: Next.js 14 + Turso (libSQL) + Vercel + Recharts + TailwindCSS
- **Primary user**: Roger Grubb (solo founder, 62 y/o, non-CLI, business-first mindset)
- **Explicit non-goals**: N/A yet

## 2. Definition of Done (DoD)
- **Current sprint**: Strategic assessment of what to track for decision-making, defense, and profitability
- Functional requirements: TBD based on strategic analysis
- Non-functional: Must be maintainable by a solo operator, no CLI dependency

## 3. Current State
- **Build**: Deployed to Vercel at analytics.numberoneson.us
- **Storage**: Migrated from Vercel KV (Redis) to Turso (SQLite/libSQL)
- **Tracker**: ~2KB vanilla JS, cookie-free, fingerprint-based
- **Dashboard**: Password-protected, dark theme, site selector, 1/7/30/90 day views
- **Current tracking**: Pageviews, clicks, leave events, scroll depth, session duration, UTM params, device/browser/OS, geo (country/region/city), basic conversion funnel (visit→signup→paid)
- **Known gaps identified**: See strategic analysis

## 4. Architecture & Design Decisions
- Turso (libSQL) over Vercel KV — persistent SQL, better for analytical queries
- No cookies — fingerprint only (privacy-first)
- ip-api.com for geolocation (free tier, in-memory cache)
- In-memory rate limiting (100 req/min/IP)
- Base64 cookie auth for dashboard (simple but functional)
- 90-day retention window mentioned in README but NOT enforced in Turso schema (no TTL/cleanup)

## 5. Known Issues & Landmines
- **No data cleanup**: 90-day retention stated but no cron/cleanup implemented for Turso
- **Auth is weak**: Base64-encoded password in cookie, no CSRF, no session invalidation
- **Funnel is hardcoded**: signup/paid counts always return 0 — `storeEvent` doesn't populate funnel
- **No [site] dynamic route file found in expected location** — may be a path issue
- **ip-api.com**: Free tier has 45 req/min limit, could fail under load
- **CORS allows all .vercel.app subdomains** — overly permissive
- **ALLOWED_ORIGINS includes sellfast.now** but .now TLD doesn't exist (Vercel deprecated it)
- **No error tracking/alerting**
- **No backup strategy for Turso data**

## 6. Debug History
- (none yet)

## 7. Proven Patterns
- Turso batch queries for atomic writes
- sendBeacon for reliable leave-event delivery
- Vanilla JS tracker keeps it lightweight and fast

## 8. Failed Approaches
- (none recorded)

## 9. Open Questions / Unknowns
- Which sites are actually live and generating traffic?
- What's the Stripe/payment setup across these sites?
- What does the user want to "defend against" specifically? (competitors, legal, bots, fraud?)
- Are there any existing Google Analytics or other trackers on these sites?

## 10. Next Actions
1. Deliver strategic analysis of what to track
2. Prioritize enhancements based on user feedback
3. Implement agreed-upon tracking improvements
