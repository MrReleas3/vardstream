# Streaming Platform Backend Architecture & Specifications (v2)

This document outlines the complete system architecture for a private, invite-only movie/TV streaming platform that aggregates third-party embed providers. Designed for **<100 users**, prioritizing simplicity, zero cost, and operational ease.

---

## 1. Core System Architecture

The system is a **monolith** — a single Next.js application handling both frontend rendering and API routes. It acts as a metadata catalog, embed router, and user state manager — never a media host.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Free Tier)                │
│                                                     │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │  Next.js App  │    │   API Routes (/api/*)     │  │
│  │  (Frontend)   │◄──►│   - Auth & Invite Codes   │  │
│  │  SSR + CSR    │    │   - Metadata Proxy        │  │
│  │               │    │   - Embed Router          │  │
│  │               │    │   - User Activities       │  │
│  │               │    │   - Telemetry             │  │
│  │               │    │   - Admin Panel           │  │
│  └──────────────┘    └──────┬──────────┬──────────┘  │
│                             │          │             │
└─────────────────────────────┼──────────┼─────────────┘
                              │          │
                    ┌─────────▼──┐  ┌────▼──────────┐
                    │  Upstash   │  │ MongoDB Atlas  │
                    │  Redis     │  │ (Free Tier)    │
                    │ (Free Tier)│  │                │
                    │            │  │ - Users        │
                    │ - TMDb     │  │ - Activities   │
                    │   cache    │  │ - Invite Codes │
                    │ - Provider │  │ - Providers    │
                    │   health   │  │ - Telemetry    │
                    └────────────┘  └────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   External APIs    │
                    │ - TMDb API         │
                    │ - Simkl API        │
                    │ - Embed Providers  │
                    └────────────────────┘
```

### Why This Stack (All Free)

| Service | Free Tier Limits | Why It Works |
|---|---|---|
| **Vercel** | 100GB bandwidth, 100k serverless invocations/month | <100 users won't hit these limits |
| **MongoDB Atlas** | 512MB storage, shared cluster | Text-only data for <100 users ≈ a few MB |
| **Upstash Redis** | 10k commands/day, 256MB | Cached TMDb responses are small; <100 users generate few reads |
| **TMDb API** | Free with attribution | Standard for metadata |
| **GitHub** | Free private repos + Actions (2000 min/month) | CI/CD pipeline |

> [!IMPORTANT]
> **Serverless Implications**: Vercel API routes are serverless functions. This means:
> - No persistent connections — use Upstash REST-based Redis client (not `ioredis`)
> - No long-running background workers — use Vercel Cron Jobs (free tier: 2 cron jobs)
> - No WebSocket support on free tier — "continue watching" sync uses polling or on-navigation updates
> - Cold starts possible (~200-500ms) but negligible at this scale

---

## 2. Authentication & Access Control

### Invite Code System

The platform is **private by design**. No open registration. The admin generates single-use invite codes to control access.

#### Flow

```
Admin generates code → Shares with trusted user → User registers with code → Code is consumed
```

#### Invite Code Lifecycle

```
┌──────────┐    User registers    ┌──────────┐    Code expires/    ┌──────────┐
│  ACTIVE  │ ──────────────────►  │   USED   │    admin deletes    │ EXPIRED  │
└──────────┘                      └──────────┘ ──────────────────► └──────────┘
     │                                                                  ▲
     │                    Unused past expiry date                       │
     └──────────────────────────────────────────────────────────────────┘
```

### JWT Authentication

Since the platform is serverless, stateless JWT is the natural fit.

| Token | Storage | TTL | Purpose |
|---|---|---|---|
| **Access Token** | Memory (JS variable) | 15 minutes | API authentication |
| **Refresh Token** | `httpOnly` secure cookie | 7 days | Silent access token renewal |

#### Auth Middleware

Every API route except `/api/auth/*` and `/api/health` passes through middleware that:
1. Extracts the access token from the `Authorization: Bearer <token>` header
2. Verifies the JWT signature and expiration
3. Attaches `req.user = { userId, role }` to the request
4. Returns `401` if invalid, `403` if role insufficient

#### Admin Capabilities
- Generate invite codes (single or batch)
- Revoke invite codes
- View all users and their activity
- Disable/ban users
- Manage provider registry
- View platform telemetry dashboard

---

## 3. Database Schema (MongoDB Atlas)

### Collections

#### A. `users`

```js
{
  _id: ObjectId,
  email: String,              // unique index
  username: String,           // unique index
  passwordHash: String,       // bcrypt, 12 rounds
  role: "user" | "admin",
  inviteCodeUsed: String,     // which code they registered with
  preferences: {
    defaultSubtitleLang: "en",
    autoPlayNext: true,
    theme: "dark"
  },
  simklToken: {               // nullable — Simkl OAuth integration
    accessToken: String,
    refreshToken: String,
    expiresAt: ISODate
  },
  isDisabled: false,          // admin can disable accounts
  lastActiveAt: ISODate,
  createdAt: ISODate
}
```
**Indexes**: `{ email: 1 }` unique, `{ username: 1 }` unique

---

#### B. `invite_codes`

```js
{
  _id: ObjectId,
  code: String,               // unique, 8-char alphanumeric (e.g., "A3X9K2M7")
  createdBy: ObjectId,        // admin userId
  usedBy: ObjectId | null,    // userId who consumed it
  status: "active" | "used" | "expired" | "revoked",
  expiresAt: ISODate | null,  // optional expiry for unused codes
  createdAt: ISODate,
  usedAt: ISODate | null
}
```
**Indexes**: `{ code: 1 }` unique, `{ status: 1 }`

---

#### C. `user_activities`

One document per user per media item. Tracks watchlist status AND playback progress (for "continue watching").

```js
{
  _id: ObjectId,
  userId: ObjectId,
  mediaId: Number,            // TMDb ID
  mediaType: "movie" | "tv",
  status: "plan_to_watch" | "watching" | "completed" | "dropped",
  isFavorite: false,
  progress: {
    // For movies:
    timestampSeconds: 1450,   // resume point
    // For TV shows:
    lastSeason: 2,
    lastEpisode: 5,
    episodeTimestampSeconds: 830
  },
  rating: Number | null,      // 1-10, user rating
  updatedAt: ISODate,
  createdAt: ISODate
}
```
**Indexes**: `{ userId: 1, mediaId: 1, mediaType: 1 }` unique compound, `{ userId: 1, status: 1 }` for filtered lists, `{ userId: 1, updatedAt: -1 }` for "continue watching" sorted by recency

---

#### D. `providers`

Admin-managed registry of embed providers. Replaces hardcoded provider configs.

```js
{
  _id: ObjectId,
  name: "VidSrc",
  slug: "vidsrc",             // URL-safe identifier
  baseUrl: "https://vidsrc.to/embed",
  urlPatterns: {
    movie: "/movie/{tmdbId}",
    tv: "/tv/{tmdbId}/{season}/{episode}"
  },
  supportedTypes: ["movie", "tv"],  // capability mapping
  supportedQualities: ["720p", "1080p", "4K"],
  supportsSubtitles: true,
  subtitleLangs: ["en", "es", "fr"],
  geoRestrictions: [],        // empty = no restrictions
  isEnabled: true,            // admin toggle
  priority: 1,                // default ordering (lower = higher priority)
  healthScore: 95,            // 0-100, updated by telemetry cron
  failureCount24h: 3,
  circuitBreakerTripped: false,
  lastCheckedAt: ISODate,
  createdAt: ISODate
}
```
**Indexes**: `{ slug: 1 }` unique, `{ isEnabled: 1, healthScore: -1 }` for sorted active providers

> [!NOTE]
> The original design had separate `provider_health` and hardcoded provider configs. Merging them into a single `providers` collection simplifies the model — at <100 users there's no write contention concern.

---

#### E. `telemetry_logs`

Raw failure reports from clients. Processed by a cron job that updates `providers.healthScore`.

```js
{
  _id: ObjectId,
  mediaId: Number,
  mediaType: "movie" | "tv",
  providerSlug: String,
  reportType: "auto_switch" | "manual_report" | "load_timeout",
  reportedBy: ObjectId,       // userId
  userAgent: String,          // for debugging browser-specific issues
  createdAt: ISODate          // TTL index: auto-delete after 48 hours
}
```
**Indexes**: `{ createdAt: 1 }` TTL (48h), `{ providerSlug: 1, createdAt: -1 }` for aggregation queries

---

## 4. Caching Strategy (Upstash Redis)

### Why Upstash Over Standard Redis

Upstash provides a **REST-based Redis** client (`@upstash/redis`) that works natively in serverless environments — no persistent TCP connections needed. Perfect for Vercel.

### Key Naming Convention

```
tmdb:movie:{tmdbId}                    → Cached movie metadata
tmdb:tv:{tmdbId}                       → Cached TV show metadata
tmdb:tv:{tmdbId}:s{season}             → Cached season details
tmdb:search:{query_hash}               → Search result cache
tmdb:trending:{type}:{window}          → Trending lists (movie|tv, day|week)
tmdb:genre:{type}                      → Genre lists
providers:streams:{mediaType}:{tmdbId} → Pre-built stream arrays
```

### TTL Strategy

| Content Type | TTL | Rationale |
|---|---|---|
| Old movies (>1 year) | 30 days | Metadata rarely changes |
| New/upcoming movies | 12 hours | Release info updates frequently |
| Ongoing TV shows | 4 hours | New episodes, updated ratings |
| Trending/homepage | 1 hour | Must feel fresh |
| Search results | 6 hours | Balances freshness vs. API calls |
| Stream arrays | 5 minutes | Health scores change; keep current |

### Cache-Aside with Stale-While-Revalidate

```
Request → Check Redis → HIT? → Return cached data
                          │
                         MISS → Fetch from TMDb → Strip unused fields
                                                 → Write to Redis
                                                 → Return data
```

For high-traffic keys (trending, homepage):
1. Serve from Redis immediately (even if slightly stale)
2. Check a `_refreshedAt` field in the cached object
3. If older than soft-TTL, **tag the response** so the frontend knows to fire a background revalidation call to `POST /api/internal/revalidate`

### Redis Failure Fallback

If Upstash is unreachable:
1. Log the error
2. Fall through to direct TMDb API call
3. Serve with a `Cache-Control: no-store` header so the frontend doesn't assume it's cached
4. Do NOT retry Redis on the same request (fail-open)

### Data Stripping (Adapter Layer)

Never cache raw TMDb responses. Transform through an adapter that keeps only:

```js
// Movie adapter output (what gets cached)
{
  tmdbId: 27205,
  imdbId: "tt1375666",
  title: "Inception",
  overview: "A thief who steals corporate secrets...",
  posterPath: "/9gk7adzbIIo86gS4YjCbSg...",
  backdropPath: "/s3TBrRGB1iav...",
  releaseDate: "2010-07-16",
  runtime: 148,
  genres: [{ id: 28, name: "Action" }, ...],
  voteAverage: 8.4,
  status: "Released",
  _cachedAt: "2026-09-02T07:00:00Z"
}
```

---

## 5. API Design (REST)

All endpoints are Next.js API routes under `/api/`. Responses follow a consistent envelope:

```js
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": { "code": "INVALID_INVITE", "message": "..." } }
```

### Endpoint Reference

#### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register with invite code |
| `POST` | `/api/auth/login` | None | Email + password login |
| `POST` | `/api/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/api/auth/logout` | Cookie | Clear refresh token |
| `GET` | `/api/auth/me` | JWT | Get current user profile |
| `PATCH` | `/api/auth/me` | JWT | Update preferences |

#### Content (Metadata)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/content/trending` | JWT | Trending movies & TV (homepage) |
| `GET` | `/api/content/search?q=...&type=...` | JWT | Search TMDb (proxied + cached) |
| `GET` | `/api/content/movie/:tmdbId` | JWT | Movie details |
| `GET` | `/api/content/tv/:tmdbId` | JWT | TV show details |
| `GET` | `/api/content/tv/:tmdbId/season/:num` | JWT | Season episode list |
| `GET` | `/api/content/genre/:type` | JWT | Genre list for movie or tv |
| `GET` | `/api/content/discover?genre=...&sort=...` | JWT | Filtered browsing |

#### Streams (Embed Router)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/streams/movie/:tmdbId` | JWT | Get embed URLs for a movie |
| `GET` | `/api/streams/tv/:tmdbId/:season/:episode` | JWT | Get embed URLs for an episode |

**Response** (ordered by health score, filtered by capability):
```json
{
  "ok": true,
  "data": {
    "streams": [
      {
        "provider": "VidSrc",
        "slug": "vidsrc",
        "url": "https://vidsrc.to/embed/movie/27205",
        "health": 98,
        "qualities": ["720p", "1080p"],
        "subtitles": true
      },
      {
        "provider": "SuperEmbed",
        "slug": "superembed",
        "url": "https://superembed.stream/e/27205",
        "health": 82,
        "qualities": ["720p"],
        "subtitles": false
      }
    ]
  }
}
```

#### User Activities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/activities` | JWT | Get user's full activity list (with filters) |
| `GET` | `/api/activities/continue-watching` | JWT | Recent "watching" items, sorted by `updatedAt` |
| `PUT` | `/api/activities/:mediaType/:tmdbId` | JWT | Upsert activity (watchlist, progress, rating) |
| `DELETE` | `/api/activities/:mediaType/:tmdbId` | JWT | Remove from activity list |

#### Telemetry

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/telemetry/embed-failure` | JWT | Report a broken embed |

#### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/users` | Admin | List all users |
| `PATCH` | `/api/admin/users/:userId` | Admin | Disable/enable user |
| `POST` | `/api/admin/invite-codes` | Admin | Generate invite code(s) |
| `GET` | `/api/admin/invite-codes` | Admin | List all invite codes |
| `DELETE` | `/api/admin/invite-codes/:code` | Admin | Revoke an invite code |
| `GET` | `/api/admin/providers` | Admin | List providers |
| `POST` | `/api/admin/providers` | Admin | Add a provider |
| `PATCH` | `/api/admin/providers/:slug` | Admin | Update provider config |
| `DELETE` | `/api/admin/providers/:slug` | Admin | Remove a provider |
| `GET` | `/api/admin/telemetry/summary` | Admin | Aggregated failure stats |

#### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check (DB + Redis connectivity) |

### Rate Limiting

Use `@upstash/ratelimit` (works natively with Upstash Redis in serverless):

| Endpoint Group | Limit | Window |
|---|---|---|
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/register` | 3 requests | 1 hour |
| `/api/content/*` | 60 requests | 1 minute |
| `/api/streams/*` | 30 requests | 1 minute |
| `/api/telemetry/*` | 10 requests | 1 minute |
| `/api/admin/*` | 30 requests | 1 minute |

---

## 6. Embed Router (Provider Registry)

### How It Works

The embed router reads from the `providers` collection and dynamically constructs URLs:

```js
function buildStreamUrl(provider, mediaType, tmdbId, season, episode) {
  let pattern = provider.urlPatterns[mediaType];
  if (!pattern) return null; // provider doesn't support this type

  return provider.baseUrl + pattern
    .replace("{tmdbId}", tmdbId)
    .replace("{season}", season)
    .replace("{episode}", episode);
}
```

### Provider Resolution Flow

```
Request for streams
       │
       ▼
Fetch all enabled providers from DB
       │
       ▼
Filter by: supports mediaType + not circuit-broken
       │
       ▼
Sort by healthScore DESC, then priority ASC
       │
       ▼
Build URL for each using urlPatterns
       │
       ▼
Return array with health + capability metadata
```

### Adding a New Provider

Admin uses `POST /api/admin/providers` with the provider's URL pattern. No code changes or redeployment needed. The registry is fully data-driven.

---

## 7. Resiliency: Handling Broken Embeds

### Client-Side Detection

The frontend detects failures through:
1. **`onerror` on iframe** — network-level failure
2. **Load timeout** — iframe hasn't fired `load` event within 10 seconds
3. **Rapid switching** — user switches providers 3+ times in 30 seconds (likely all broken)
4. **Manual report** — "Report Broken" button

### Telemetry → Health Score Pipeline

```
Client reports failure → POST /api/telemetry/embed-failure
                                    │
                                    ▼
                         Write to telemetry_logs
                                    │
                    ┌───────────────┘
                    │ (Vercel Cron — every 15 min)
                    ▼
            Aggregate failures by provider in last 24h
                    │
                    ▼
            Calculate healthScore:
              100 - (failureCount * penaltyWeight)
                    │
                    ▼
            Update providers collection
                    │
                    ▼
            If healthScore < 20 → trip circuit breaker
            If healthScore recovers > 50 → reset breaker
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/update-provider-health",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/cleanup-telemetry",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

> [!NOTE]
> Vercel free tier allows **2 cron jobs**. We use both: one for provider health aggregation (every 15 min) and one for telemetry cleanup (every 6 hours). The cleanup cron handles what MongoDB TTL indexes would do — but gives us more control over batch sizes.

---

## 8. Simkl Integration

### Purpose
Sync watch history bidirectionally with [Simkl](https://simkl.com/) for users who want cross-platform tracking.

### OAuth Flow

```
User clicks "Connect Simkl" → Redirect to Simkl OAuth
       → User authorizes → Callback to /api/auth/simkl/callback
       → Store access + refresh tokens in users.simklToken
```

### Sync Behavior
- **On activity update**: If user has Simkl connected, fire-and-forget a sync call to Simkl's API when they update watch status
- **Manual full sync**: User can trigger a full sync from settings (import from Simkl → local activities, or export local → Simkl)
- **No automatic background sync** — keeps it simple, avoids rate limits

---

## 9. Search & Discovery

### Search Flow

```
User types query → Frontend debounces (300ms)
       → GET /api/content/search?q=inception&type=movie
       → Check Redis cache (tmdb:search:{hash})
       → MISS: proxy to TMDb /search/multi
       → Strip & cache result (6h TTL)
       → Return results
```

### Homepage Composition

The homepage is assembled from multiple cached TMDb endpoints:

| Section | Source | Cache Key |
|---|---|---|
| Continue Watching | `user_activities` (local DB) | No cache (personalized) |
| Trending Movies | TMDb `/trending/movie/day` | `tmdb:trending:movie:day` |
| Trending TV | TMDb `/trending/tv/day` | `tmdb:trending:tv:day` |
| Popular Movies | TMDb `/movie/popular` | `tmdb:popular:movie` |
| Top Rated | TMDb `/movie/top_rated` | `tmdb:toprated:movie` |

> [!TIP]
> Use `Promise.allSettled()` to fetch all sections in parallel. If one fails (e.g., TMDb rate limit), the others still render. The frontend shows a skeleton for failed sections.

---

## 10. Security Hardening

### Input Validation
- Use `zod` for request body/query validation on all API routes
- Reject any request that doesn't match the schema with `400`

### Headers (via `next.config.js`)
```js
headers: [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=()" }
]
```

### Password Hashing
- bcrypt with cost factor 12
- Minimum password length: 8 characters

### JWT Secrets
- Store in Vercel Environment Variables (never in code)
- Separate secrets for access and refresh tokens

### CORS
- Restrict to your own domain only (since it's a monolith, same-origin requests don't need CORS — but lock it down anyway)

---

## 11. Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, Register pages
│   │   ├── (main)/             # Authenticated layout
│   │   │   ├── page.tsx        # Homepage
│   │   │   ├── movie/[id]/     # Movie detail + player
│   │   │   ├── tv/[id]/        # TV detail + player
│   │   │   ├── search/         # Search results
│   │   │   └── settings/       # User preferences + Simkl
│   │   ├── admin/              # Admin panel
│   │   └── api/                # API routes
│   │       ├── auth/
│   │       ├── content/
│   │       ├── streams/
│   │       ├── activities/
│   │       ├── telemetry/
│   │       ├── admin/
│   │       ├── cron/
│   │       └── health/
│   ├── lib/
│   │   ├── db.ts               # MongoDB connection (cached)
│   │   ├── redis.ts            # Upstash Redis client
│   │   ├── auth.ts             # JWT utilities
│   │   ├── tmdb.ts             # TMDb API client + adapters
│   │   ├── simkl.ts            # Simkl API client
│   │   ├── embed-router.ts     # Provider URL builder
│   │   ├── rate-limit.ts       # Upstash rate limiter
│   │   └── validators/         # Zod schemas
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript type definitions
├── vercel.json                 # Cron jobs config
├── .env.local                  # Local env vars
└── .env.example                # Template for required env vars
```

---

## 12. Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...@cluster.mongodb.net/streaming

# Cache
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Auth
JWT_ACCESS_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<different-random-64-chars>

# External APIs
TMDB_API_KEY=<your-tmdb-api-key>
TMDB_BASE_URL=https://api.themoviedb.org/3
SIMKL_CLIENT_ID=<your-simkl-client-id>
SIMKL_CLIENT_SECRET=<your-simkl-secret>

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
ADMIN_INITIAL_EMAIL=admin@example.com
```

---

## 13. CI/CD Pipeline (GitHub Actions)

### Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Branch Strategy
- `main` → auto-deploys to production
- Pull requests → Vercel preview deployments (automatic)
- Feature branches → local dev only

---

## 14. Development Workflow

### First-Time Setup
```bash
git clone <repo>
npm install
cp .env.example .env.local     # fill in secrets
npx prisma db seed             # seed admin user (or custom seed script)
npm run dev                    # http://localhost:3000
```

### Admin Bootstrapping
On first deploy, use `ADMIN_INITIAL_EMAIL` env var. A seed script creates the admin user with a temporary password logged to the console. The admin then:
1. Logs in and changes password
2. Generates invite codes for users
3. Configures providers via the admin panel

---

## Summary of Improvements Over v1

| Area | v1 | v2 |
|---|---|---|
| **Auth** | Just a passwordHash field | Full invite-code system, JWT with refresh tokens, role-based access |
| **API** | 1 endpoint mentioned | 25+ endpoints fully defined with auth requirements |
| **Providers** | Hardcoded, separate health collection | Data-driven registry, admin-managed, merged health tracking |
| **Deployment** | Unspecified | Vercel + MongoDB Atlas + Upstash Redis (all free) |
| **Search** | Not addressed | Proxied TMDb search with caching |
| **Security** | Not addressed | Rate limiting, input validation, security headers, CORS |
| **Observability** | Minimal | Health endpoint, telemetry pipeline, admin dashboard |
| **CI/CD** | Not addressed | GitHub Actions → Vercel auto-deploy |
| **Integrations** | None | Simkl sync for cross-platform tracking |
| **Project Structure** | None | Full directory layout with separation of concerns |
