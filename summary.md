# Project Summary: VardStream Private Streaming Platform

This document summarizes the full system architecture review, backend and frontend implementation, authentication systems, catalog integrations, and operational workflows for the **VardStream** platform.

---

## 1. Architecture & Blueprint Overview
- **Core Architecture Document**: [`streaming_platform_architecture.md`](file:///d:/VardSrm/streaming_platform_architecture.md)
- **Target Scale**: Private, invite-only community platform for `< 100 users`.
- **Infrastructure (Zero-Cost Tier)**:
  - **Monolith Framework**: Next.js (App Router with TypeScript) hosted on **Vercel**.
  - **Database**: **MongoDB Atlas (M0)** with cached connection singletons.
  - **Caching & Rate Limiting**: **Upstash Redis** (REST-based serverless client with sliding-window limiters).
  - **Metadata Source**: **TMDb API** with stripped data adapters.
  - **Watch Progress Sync**: **Simkl API** via OAuth2.
  - **CI/CD Automation**: **GitHub Actions** (`.github/workflows/deploy.yml`).

---

## 2. Core Implementation & Codebase

### Backend Libraries (`src/lib/`)
- [`src/lib/db.ts`](file:///d:/VardSrm/src/lib/db.ts): MongoDB Atlas connection caching singleton with in-memory dev fallback.
- [`src/lib/redis.ts`](file:///d:/VardSrm/src/lib/redis.ts): Upstash Redis client with fail-open in-memory caching.
- [`src/lib/rate-limit.ts`](file:///d:/VardSrm/src/lib/rate-limit.ts): Sliding-window rate limiters for auth, content, streams, and telemetry.
- [`src/lib/auth.ts`](file:///d:/VardSrm/src/lib/auth.ts): JWT token signing/verification (`jose`), password hashing (`bcryptjs`), and root `httpOnly` cookie management.
- [`src/lib/embed-router.ts`](file:///d:/VardSrm/src/lib/embed-router.ts): Data-driven provider registry supporting *VidSrc*, *SuperEmbed*, *AutoEmbed*, and *2Embed*.
- [`src/lib/tmdb.ts`](file:///d:/VardSrm/src/lib/tmdb.ts): Live TMDb metadata client with data-stripping adapters and fallback mock catalog.
- [`src/lib/simkl.ts`](file:///d:/VardSrm/src/lib/simkl.ts): Simkl OAuth2 integration and fire-and-forget watch progress syncing.
- [`src/lib/seed.ts`](file:///d:/VardSrm/src/lib/seed.ts): Database auto-bootstrapping for initial admin user, starter invite codes, and default stream providers.
- [`src/lib/validators/index.ts`](file:///d:/VardSrm/src/lib/validators/index.ts): Zod schemas for all request payloads.

### 24 Production REST API Routes (`src/app/api/`)
- **Authentication**: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/simkl/callback`
- **Catalog & Content**: `/api/content/trending`, `/api/content/search`, `/api/content/movie/[id]`, `/api/content/tv/[id]`, `/api/content/tv/[id]/season/[seasonNum]`
- **Embed Streams**: `/api/streams/movie/[id]`, `/api/streams/tv/[id]/[season]/[episode]`
- **User Activity & History**: `/api/activities`, `/api/activities/continue-watching`, `/api/activities/[mediaType]/[id]`
- **Administration**: `/api/admin/users`, `/api/admin/invite-codes`, `/api/admin/providers`, `/api/admin/telemetry/summary`
- **Scheduled Cron & Health**: `/api/cron/update-provider-health`, `/api/cron/cleanup-telemetry`, `/api/health`

---

## 3. UI & Frontend Features

- **Global Styling** ([`src/app/globals.css`](file:///d:/VardSrm/src/app/globals.css)): Sleek dark glassmorphic design system with gradient accents and responsive components.
- **Navbar** ([`src/components/Navbar.tsx`](file:///d:/VardSrm/src/components/Navbar.tsx)): Responsive header with live search, watchlist link, admin badge, and user dropdown.
- **Video Player** ([`src/components/Player.tsx`](file:///d:/VardSrm/src/components/Player.tsx)): Embed player wrapper with live server switcher, health indicator badges (green/yellow/red), 12s canary timeout detector, and automatic playback timestamp saving.
- **Dynamic Homepage** ([`src/app/page.tsx`](file:///d:/VardSrm/src/app/page.tsx)): Cinematic hero banner + 5 dynamic horizontal scrolling rails (Trending Today, Blockbusters, TV Shows, Masterpieces, Top Series).
- **Detail Pages**:
  - Movie Player ([`src/app/movie/[id]/page.tsx`](file:///d:/VardSrm/src/app/movie/[id]/page.tsx))
  - TV Series Player with Season / Episode Selector ([`src/app/tv/[id]/page.tsx`](file:///d:/VardSrm/src/app/tv/[id]/page.tsx))
- **Discovery**: Debounced instant search page ([`src/app/search/page.tsx`](file:///d:/VardSrm/src/app/search/page.tsx)).
- **Library**: Personal Watchlist & Playback history with status filters ([`src/app/watchlist/page.tsx`](file:///d:/VardSrm/src/app/watchlist/page.tsx)).
- **Settings**: Playback preferences & Simkl sync ([`src/app/settings/page.tsx`](file:///d:/VardSrm/src/app/settings/page.tsx)).
- **Admin Command Center** ([`src/app/admin/page.tsx`](file:///d:/VardSrm/src/app/admin/page.tsx)): Invite code generation/revocation, user lock/enable toggles, provider template editor, and telemetry metrics.

---

## 4. Key Fixes & Enhancements

1. **Route Protection Middleware** ([`src/middleware.ts`](file:///d:/VardSrm/src/middleware.ts)):
   - Unauthenticated visitors are automatically redirected to the `/welcome` landing page.
   - Authenticated members visiting `/welcome` or `/login` are routed to the main app (`/`).
   - Admin routes are gated strictly to accounts with the `admin` role.
2. **Minimalist Landing Page** ([`src/app/welcome/page.tsx`](file:///d:/VardSrm/src/app/welcome/page.tsx)): Clean onboarding page for invite code registration and sign-in.
3. **Session Cookie Persistence**: Converted access and refresh tokens to root `httpOnly` (`path: "/"`) cookies so all page navigations and API requests stay authenticated without 401 dropouts.
4. **Live TMDb API Integration**: Added TMDb API key into [`.env.local`](file:///d:/VardSrm/.env.local), tested live connectivity, and enabled dynamic on-demand catalog fetching across all rails (80–100+ titles).

---

## 5. Verification & Operational Instructions

- **Build Validation**: Executed `npm run build` — compiled all 29 routes and the middleware with **zero errors**.
- **Running Locally**:
  ```bash
  npm run dev
  ```
  App available at **http://localhost:3000**.
- **Initial Seed Credentials**:
  - **Admin**: `admin@vardsrm.local` / `admin12345`
  - **Starter Invites**: `VIP-ALPHA-2026`, `STREAM-FREE-01`, `CINEMA-PASS-99`
