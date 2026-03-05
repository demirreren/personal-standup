# standup.

A personal accountability tool built around one idea: **your morning plan vs. your evening reality**. That gap is where the growth happens.

Two check-ins a day. Thirty seconds each. An AI coach that spots patterns you don't.

## What it does

- **Morning standup** — Log how you're feeling (1-10), what you did yesterday, your plan for today, and any blockers.
- **Evening reflection** — Log what actually happened and what's carrying over to tomorrow.
- **AI nudges** — After each check-in, GPT-4o-mini looks at your last 14 days and surfaces a non-obvious pattern (recurring blockers, energy dips, plan-vs-reality gaps).
- **Daily summaries** — AI-generated "diagnosis + priority + first step + fallback rule" framework.
- **Weekly digests** — Wins, patterns, blocker analysis, and a shareable public link.
- **Dashboard** — Streak tracking, follow-through rate (% of mornings that get an evening reflection), feeling trends over time, and a GitHub-style completion heatmap.
- **History** — Horizontal timeline of all past check-ins with scroll-based month navigation.

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Ruby on Rails 8.1 (API mode), PostgreSQL |
| Frontend | React 19, TypeScript, Vite |
| AI | OpenAI GPT-4o-mini |
| Auth | JWT (bcrypt + HS256) |
| Charts | Recharts |
| Animations | Framer Motion, GSAP, OGL (WebGL shaders) |
| Icons | Lucide React |

## Architecture

```
frontend/           React SPA (Vite)
  src/
    pages/          Today, History, Dashboard, Weekly, SharedDigest, Landing
    components/     Reusable UI (ErrorBoundary, AuthModal, BlobCursor, DarkVeil, etc.)
    context/        AuthContext (JWT token management)
    lib/            API client (typed fetch wrapper), shared utilities

backend/            Rails 8.1 API
  app/
    models/         User, Checkin, DailySummary, WeeklyDigest
    controllers/    api/v1/ — RESTful endpoints + auth
    services/       AiService (OpenAI integration), JwtService
  db/
    migrations/     Schema evolution (structured standup fields added iteratively)
  test/
    models/         User and Checkin validation tests
    services/       JWT encode/decode tests
```

## Database design

- **users** — email (unique, indexed), bcrypt password, share_token, timezone (auto-synced from browser)
- **checkins** — morning/evening enum, structured fields (today_plan, what_happened, blockers, carry_over, feeling 1-10), composite unique index on `[user_id, date, checkin_type]`
- **daily_summaries** — AI-generated summary per user per day, unique on `[user_id, date]`
- **weekly_digests** — AI digest + computed metrics (avg_energy, completion_rate), shareable via unique token

All tables have proper foreign keys, and text fields are validated to max 2000 chars.

## Setup

### Prerequisites

- Ruby 3.2+
- PostgreSQL
- Node.js 18+
- OpenAI API key (optional — app works without it, AI features degrade gracefully)

### Backend

```bash
cd backend
bundle install
bin/rails db:create db:migrate
echo "OPENAI_API_KEY=sk-..." > .env   # optional
bin/rails server                       # runs on :3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                            # runs on :5173
```

### Tests

```bash
cd backend
bin/rails test
```

## Key design decisions

**Morning/evening as an enum, not separate models.** A single `checkins` table with a `checkin_type` enum keeps queries simple and lets the composite unique index enforce the "one morning, one evening per day" business rule at the database level.

**Timezone auto-sync.** The frontend sends `X-Timezone` on every request. The backend silently updates the user's timezone via `update_column` (skipping validations/callbacks for performance). This means "today" is always the user's local today, not UTC.

**Streak calculation in one query.** Loads all distinct dates in a single `pluck`, then walks backwards in Ruby. No N+1.

**AI fallback.** If `OPENAI_API_KEY` is missing, `AiService` returns a static JSON response so the app still functions. JSON parsing errors from OpenAI are rescued and the raw response is stored.

**Shareable weekly digests.** Each digest gets a unique `share_token`. The public endpoint exposes only the digest data and user's first name — no auth required, no sensitive data leaked.

## What I'd do next

- Deploy to Render/Fly.io with production PostgreSQL
- Add notification reminders (email or push) for morning/evening check-ins
- Editable check-ins (currently immutable after submission)
- Dark/light theme toggle
- PWA support for mobile home screen install
- Rate limiting on auth endpoints
- Request-level error tracking (Sentry)

## Built by

[Demir Eren](https://github.com/demirreren) — built in ~35 hours as a challenge project.
