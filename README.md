# Weather Station — Córdoba REM

Single-page dashboard for [REM](https://rem.cba.gov.ar/) agro-meteorology data: React UI, optional persistence in PostgreSQL (Supabase), and deployment on Vercel or Docker.

## Requirements

- Node.js 20+
- npm
- A Supabase (or other PostgreSQL) database if you want history and Vercel-side reads

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set **`DATABASE_URL`** to your **Supabase transaction pooler** URI (port `6543`, `pgbouncer=true`). See [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres).

3. Apply the schema:

   ```bash
   # Run the SQL in Supabase SQL Editor, or use the CLI if you use Supabase migrations locally:
   # supabase/migrations/001_weather_readings.sql
   ```

## Local development

```bash
npm run dev
```

Starts Express with Vite middleware (default **http://localhost:3000**). `GET /api/weather` loads data from REM, upserts rows into `weather_readings`, and returns the same JSON array the UI expects.

Other commands:

| Command        | Purpose                          |
|----------------|----------------------------------|
| `npm run build`| Production frontend → `dist/`    |
| `npm run start`| Production Express + static `dist` |
| `npm run lint` | `tsc --noEmit`                   |
| `npm run preview` | Preview built assets (Vite)  |

Optional background ingest on the Node server (not used on Vercel), via `.env`:

- `WEATHER_CRON_ENABLED` — set to `false` to disable scheduled ingest (default: enabled unless set to `false`).
- `WEATHER_CRON` — cron expression (default `*/5 * * * *`).

## Environment variables

| Variable           | Required | Where used |
|--------------------|----------|------------|
| `DATABASE_URL`     | Yes, for DB features | Local server, Docker, Vercel |
| `CRON_SECRET`      | Yes on Vercel if you use cron | Vercel only; `Authorization: Bearer …` on `/api/cron/ingest-weather` |
| `WEATHER_CRON`     | No       | `server.ts` only |
| `WEATHER_CRON_ENABLED` | No   | `server.ts` only |

See `.env.example` for copy-paste templates. The weather API path requires `DATABASE_URL`; Vercel cron security requires `CRON_SECRET`.

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/weather` | Current REM-shaped JSON array; persists to Postgres when the server can reach REM |
| `GET`  | `/api/weather/history?stationId=&limit=&since=` | Paginated history for one station |

### Production on Vercel

Vercel serverless functions often **cannot open outbound connections** to `rem.cba.gov.ar` (timeouts from many regions). On Vercel, `GET /api/weather` therefore serves the **latest row per station** from `weather_readings` instead of calling REM. Ensure the table is populated periodically from an environment that can reach REM (e.g. this app running locally or on a host inside Argentina with working egress).

## Deploy on Vercel

1. Connect the Git repository and use the defaults from `vercel.json` (`npm run build`, output `dist`).
2. Set **Environment variables**:
   - `DATABASE_URL` — same pooler URI as local.
   - `CRON_SECRET` — long random secret; must match the bearer token Vercel sends to the cron route.
3. Redeploy after changing variables.

Cron is declared in `vercel.json` (`/api/cron/ingest-weather`, schedule in UTC). Ingest from Vercel will only succeed if REM is reachable from Vercel’s network; if not, rely on ingestion from elsewhere and use Vercel only to **read** the cache via `GET /api/weather`.

## Docker

```bash
cp .env.example .env   # set DATABASE_URL
docker compose up --build
```

Application listens on container port **3000**; Compose maps **8080 → 3000**. Makefile targets: `make up`, `make down`, `make logs`.

The image runs `server.ts` in production mode (built `dist` + Express), not Vercel’s `api/` tree.

## Project layout

- `src/` — React application
- `server.ts` — Local/production Node server (REM fetch, DB, optional cron)
- `api/` — Vercel serverless routes (`api/weather`, `api/weather/history`, `api/cron/ingest-weather`)
- `lib/` — Shared ingestion and Postgres helpers
- `supabase/migrations/` — SQL for `weather_readings`

## License

Per-file SPDX identifiers apply where present in source headers.
