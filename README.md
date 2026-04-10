<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ca091fc1-c5c3-44e4-89a5-ae1095671ba2

## Database (Supabase)

1. Create a [Supabase](https://supabase.com) project.
2. In the SQL editor, run the migration in [`supabase/migrations/001_weather_readings.sql`](supabase/migrations/001_weather_readings.sql).
3. Copy the **Transaction pooler** connection URI (port **6543**) from **Project Settings → Database** — use it as `DATABASE_URL` for Docker and Vercel.

## Run locally (Docker only)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2.

Do **not** run `npm install` / `npm run dev` on your machine for this app. All installs and Node commands happen **inside the image** at build/runtime.

1. Copy [`.env.example`](.env.example) to `.env` and set **`DATABASE_URL`** to your Supabase pooler URI (required).
2. From the project root:
   - `make up`  
   or  
   - `docker compose up --build`
3. Open [http://localhost:8080](http://localhost:8080) (maps container port 3000 → host 8080).

Docker Compose reads `.env` from the project root for variable substitution (`DATABASE_URL` is passed into the container).

Other Make targets: `make down`, `make build`, `make logs`, `make ps`.

If you change application code, rebuild so the image picks it up: `make up` (includes `--build`).

## Deploy to Vercel

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. In **Project → Settings → Environment Variables**, set:
   - **`DATABASE_URL`** — same Supabase **transaction pooler** URI as above.
   - **`CRON_SECRET`** — a long random string. Vercel Cron will call `/api/cron/ingest-weather` with `Authorization: Bearer <CRON_SECRET>`; the handler rejects requests without a match.
3. Deploy. The app builds with `npm run build` and serves `dist`; API routes live under `api/`.

[`vercel.json`](vercel.json) configures SPA rewrites and a cron schedule (`*/5 * * * *`). **Cron availability and limits depend on your Vercel plan** (Hobby may restrict scheduled jobs — check current docs). If cron is unavailable, the UI still ingests on each visit via `GET /api/weather`.

## API (same in Docker and Vercel)

- `GET /api/weather` — live REM JSON + upsert into Postgres.
- `GET /api/weather/history?stationId=...&limit=...&since=...` — stored readings.
