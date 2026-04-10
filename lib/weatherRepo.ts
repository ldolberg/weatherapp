import pg from "pg";
import {
  normalizeStationId,
  resolveSourceFecha,
} from "./weatherRowKey.js";

const { Pool } = pg;

const g = globalThis as typeof globalThis & { __weatherPgPool?: pg.Pool };

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

/** Reuse pool across Vercel warm invocations and long-lived Docker. */
export function getPool(): pg.Pool {
  if (!g.__weatherPgPool) {
    g.__weatherPgPool = createPool();
  }
  return g.__weatherPgPool;
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
