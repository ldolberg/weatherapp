-- Weather history (deduped upserts). Apply in Supabase SQL editor or: supabase db push
--
-- Connection for app / Vercel / Docker: use the Supabase *pooler* URI (Transaction mode),
-- e.g. port 6543 — Project Settings → Database → Connection string → URI (Transaction pooler).
-- Avoid opening many direct (5432) connections from serverless.

CREATE TABLE IF NOT EXISTS public.weather_readings (
  id bigserial PRIMARY KEY,
  ingested_at timestamptz NOT NULL,
  station_id text NOT NULL,
  source_fecha text NOT NULL,
  data_json jsonb NOT NULL,
  CONSTRAINT weather_readings_station_source_unique UNIQUE (station_id, source_fecha)
);

CREATE INDEX IF NOT EXISTS idx_weather_station_ingested
  ON public.weather_readings (station_id, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_weather_station_source
  ON public.weather_readings (station_id, source_fecha DESC);

-- Optional: tighten privileges if you use a dedicated DB user (recommended in production).
-- GRANT SELECT, INSERT, UPDATE ON public.weather_readings TO your_app_role;
