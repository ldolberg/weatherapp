import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

let cachedPool: pg.Pool | undefined;

function normalizeStationId(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

/** When REM omits fecha, one stable row per distinct payload per station. */
function syntheticSourceFecha(stationId: string, row: unknown): string {
  const h = createHash("sha256")
    .update(JSON.stringify(row))
    .digest("hex")
    .slice(0, 16);
  return `unknown:${stationId}:${h}`;
}

function resolveSourceFecha(
  stationId: string,
  row: Record<string, unknown>
): string {
  const fecha = row.fecha;
  if (typeof fecha === "string" && fecha.trim() !== "") return fecha.trim();
  return syntheticSourceFecha(stationId, row);
}

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl:
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
  });
}

/** Reuse pool across warm serverless invocations and long-lived Node processes. */
export function getPool(): pg.Pool {
  if (!cachedPool) {
    cachedPool = createPool();
  }
  return cachedPool;
}

export async function upsertReadings(
  pool: pg.Pool,
  rows: unknown[],
  ingestedAt: Date
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sql = `
      INSERT INTO public.weather_readings (ingested_at, station_id, source_fecha, data_json)
      VALUES ($1::timestamptz, $2, $3, $4::jsonb)
      ON CONFLICT (station_id, source_fecha) DO UPDATE SET
        ingested_at = EXCLUDED.ingested_at,
        data_json = EXCLUDED.data_json
    `;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const stationId = normalizeStationId(rec.id);
      if (!stationId) continue;
      const sourceFecha = resolveSourceFecha(stationId, rec);
      await client.query(sql, [
        ingestedAt.toISOString(),
        stationId,
        sourceFecha,
        JSON.stringify(row),
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export type HistoryRow = {
  id: number;
  ingested_at: string;
  station_id: string;
  source_fecha: string;
  data: unknown;
};

export async function queryHistory(
  pool: pg.Pool,
  opts: { stationId: string; limit: number; since?: string }
): Promise<HistoryRow[]> {
  const limit = Math.min(Math.max(1, opts.limit), 5000);
  const params: unknown[] = [opts.stationId];
  let sql = `
    SELECT id, ingested_at, station_id, source_fecha, data_json
    FROM public.weather_readings
    WHERE station_id = $1
  `;
  if (opts.since) {
    sql += ` AND ingested_at >= $2::timestamptz`;
    params.push(opts.since);
    sql += ` ORDER BY ingested_at DESC LIMIT $3`;
    params.push(limit);
  } else {
    sql += ` ORDER BY ingested_at DESC LIMIT $2`;
    params.push(limit);
  }
  const { rows } = await pool.query<{
    id: string;
    ingested_at: Date;
    station_id: string;
    source_fecha: string;
    data_json: unknown;
  }>(sql, params);
  return rows.map((r) => ({
    id: Number(r.id),
    ingested_at: new Date(r.ingested_at).toISOString(),
    station_id: r.station_id,
    source_fecha: r.source_fecha,
    data:
      typeof r.data_json === "string"
        ? (JSON.parse(r.data_json) as unknown)
        : r.data_json,
  }));
}

/** Latest REM-shaped row per station (for /api/weather when live REM is unavailable, e.g. on Vercel). */
export async function queryLatestSnapshot(pool: pg.Pool): Promise<unknown[]> {
  const sql = `
    SELECT DISTINCT ON (station_id) data_json
    FROM public.weather_readings
    ORDER BY station_id, ingested_at DESC
  `;
  const { rows } = await pool.query<{ data_json: unknown }>(sql);
  return rows.map((r) =>
    typeof r.data_json === "string"
      ? (JSON.parse(r.data_json) as unknown)
      : r.data_json
  );
}
