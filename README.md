# Remote Job Radar (`remote-job-radar`)

A personal, single-user remote job finder and scoring engine. It pulls remote software engineering jobs from free public feeds, scores and ranks them against a custom keyword and skill profile, and presents a clean, distraction-free feed checked 2–3 times a day for manual applications.

---

## Highlights & Philosophy
- **Zero Paid Services / AI APIs**: Relies on deterministic, explainable keyword and skill scoring.
- **Polite Public Ingestion**: Consumes public APIs and RSS feeds (RemoteOK, We Work Remotely, Jobicy, Himalayas) with respectful rate limits and identifiable User-Agent headers.
- **Serverless-Safe Architecture**: Next.js App Router deployed on Vercel with MongoDB Atlas free tier via cached Mongoose connections.
- **Automated Scheduling**: Ingestion is triggered periodically via GitHub Actions cron.

---

## Tech Stack
- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org) (Strict mode)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) via [Mongoose](https://mongoosejs.com)
- **Testing**: [Vitest](https://vitest.dev)
- **Styling**: Tailwind CSS / Vanilla CSS tokens
- **Deployment**: Vercel + GitHub Actions

---

## Environment Variables

Copy `.env.example` to `.env.local` to run locally:

```bash
cp .env.example .env.local
```

| Variable | Description | Example / Note |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/remote-job-radar?retryWrites=true&w=majority` |
| `INGEST_SECRET` | Bearer token securing the `/api/ingest` cron endpoint | A strong random token shared with GitHub Actions secrets |
| `APP_PASSWORD` | Simple access password for the radar dashboard UI | Personal passphrase |

---

## Setup & Local Development

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repo-url>
   npm install
   ```

2. **Configure Environment**:
   Populate `.env.local` with your MongoDB connection string.

3. **Available Scripts**:
   - `npm run dev`: Start local development server on `http://localhost:3000`
   - `npm run build`: Compile optimized Next.js production build
   - `npm run lint`: Run ESLint checks
   - `npm run typecheck`: Run TypeScript typechecks without emitting JS
   - `npm run test`: Run unit tests with Vitest

4. **Verify Health Endpoint**:
   With `MONGODB_URI` set in `.env.local`, start the server (`npm run dev`) and visit:
   ```bash
   curl http://localhost:3000/api/health
   # => {"ok":true,"jobs":0}
   ```

---

## Project Structure

```
├── .github/
│   └── workflows/        # GitHub Actions scheduled ingestion workflow
├── data/
│   └── fixtures/         # Raw payload snapshots for offline testing
├── scripts/              # Standalone utility & seed scripts
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   └── health/   # GET /api/health database connectivity check
│   ├── lib/
│   │   ├── db.ts         # Cached Mongoose connection (Vercel serverless-safe)
│   │   ├── models/       # Mongoose models (Job, Profile)
│   │   ├── scoring/      # Pure scoring engine & keyword matching logic
│   │   └── sources/      # Modular adapters (RemoteOK, WWR, Jobicy, Himalayas)
│   └── types/            # Shared TypeScript contracts (Job, Feed, etc.)
└── vitest.config.mts     # Test runner configuration
```

---

---

## Source Adapter Framework

The system utilizes a modular, pluggable adapter pattern located under [`src/lib/sources/`](file:///d:/notifyme/src/lib/sources/).

### Active Sources & Credit Attributions
- **RemoteOK** (`remoteok`): Consumes `https://remoteok.com/api`. Requires credit link on dashboard.
- **We Work Remotely** (`wwr`): Sequential RSS category feeds (Full-Stack, Front-End, Back-End). Dedupes across categories.
- **Jobicy** (`jobicy`): Consumes `https://jobicy.com/api/v2/remote-jobs`. Requires credit link; apply links must navigate to original feed `url`.
- **Himalayas** (`himalayas`): Cursor-based pagination (`https://himalayas.app/jobs/api`). Pages up to 5 batches, dropping expired and >30-day stale listings. Requires credit link.

*(Note: Remotive is explicitly omitted as its robots.txt disallows automated scrapers/bots.)*

### Adapter Contract
Every adapter implements the `SourceAdapter` interface:

```typescript
export interface SourceAdapter {
  id: 'remoteok' | 'wwr' | 'jobicy' | 'himalayas';
  fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]>;
}
```

Key normalization guarantees:
- **ID**: Deterministic `${source}:${externalId}`.
- **Description**: Sanitized plain text via `htmlToText` (stripped tags, decoded entities, max 20,000 characters).
- **Worldwide detection**: `isWorldwide: true` (open globally), `false` (restricted to specific countries), or `null` (unspecified).
- **Polite HTTP client**: 15s timeout, 2 retries with backoff, standard User-Agent (`remote-job-radar/0.1 (personal job feed)`), and `credentials: 'omit'`.
- **Fault isolation**: `runAllSources()` runs via `Promise.allSettled`, so a slow or failing source never halts other sources.

### How to Add a New Source
Adding a new source requires just two straightforward steps:
1. **Create the adapter**: Create `src/lib/sources/<source-name>.ts` exporting an object satisfying `SourceAdapter`, along with a pure `normalize<Source>` function testable via fixtures.
2. **Register the adapter**:
   - Add the source identifier to `JobSource` in [`src/types/job.ts`](file:///d:/notifyme/src/types/job.ts).
   - Add metadata (name, homepage, credit requirements) to `SOURCE_META` in [`src/lib/sources/meta.ts`](file:///d:/notifyme/src/lib/sources/meta.ts).
   - Append the new adapter to `ADAPTERS` in [`src/lib/sources/index.ts`](file:///d:/notifyme/src/lib/sources/index.ts).

---

## Roadmap & Milestones

- [x] **Chunk 1: Scaffold & Database Model**
  - Next.js 16 (App Router) + TypeScript + ESLint + Vitest.
  - Normalized `Job` type and Mongoose model with compound indexes.
  - Cached serverless Mongoose connection helper and `/api/health` route.
- [x] **Chunk 2: Feed Adapters**
  - Pluggable source adapter framework with resilient HTTP helper and text sanitizer.
  - Adapters for RemoteOK, We Work Remotely (RSS), Jobicy, and Himalayas.
  - Live verification script (`npm run sources:fetch`) and unit tests for each adapter.
- [ ] **Chunk 3: Scoring Engine**
  - Pure scoring function with title/tag/description matchers, location bonuses, and penalty weights.
  - 100% test coverage with Vitest.
- [ ] **Chunk 4: Ingestion Pipeline & Deduplication**
  - Secured `/api/ingest` endpoint (`Authorization: Bearer <INGEST_SECRET>`).
  - Upsert logic: preserving user state (`status`, application history) while updating job scores.
- [ ] **Chunk 5: Feed UI**
  - Ranked feed view with score breakdown badges, matched keywords, quick actions (hide, apply, mark applied).
  - Search, source filters, and direct apply links.
- [ ] **Chunk 6: Auth & Protection**
  - Simple cookie/session-based password gate via `APP_PASSWORD`.
- [ ] **Chunk 7: Automation & Deployment**
  - GitHub Actions cron workflow triggering `/api/ingest` 2–3 times daily.
  - Vercel deployment instructions and validation.
