import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

function ensureDirForFile(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

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

function resolveSourceFecha(stationId: string, row: Record<string, unknown>): string {
  const fecha = row.fecha;
  if (typeof fecha === "string" && fecha.trim() !== "") return fecha.trim();
  return syntheticSourceFecha(stationId, row);
}

export function openWeatherDb(dbPath: string): Database.Database {
  if (db) return db;
  ensureDirForFile(dbPath);
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingested_at TEXT NOT NULL,
      station_id TEXT NOT NULL,
      source_fecha TEXT NOT NULL,
      data_json TEXT NOT NULL,
      UNIQUE(station_id, source_fecha)
    );
    CREATE INDEX IF NOT EXISTS idx_weather_station_ingested
      ON weather_readings (station_id, ingested_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weather_station_source
      ON weather_readings (station_id, source_fecha DESC);
  `);
  return db;
}

export function getWeatherDb(): Database.Database | null {
  return db;
}

const upsertStmt = (database: Database.Database) =>
  database.prepare(`
    INSERT INTO weather_readings (ingested_at, station_id, source_fecha, data_json)
    VALUES (@ingested_at, @station_id, @source_fecha, @data_json)
    ON CONFLICT(station_id, source_fecha) DO UPDATE SET
      ingested_at = excluded.ingested_at,
      data_json = excluded.data_json
  `);

/** Upsert each station row; dedupes on (station_id, source_fecha). */
export function upsertReadings(
  database: Database.Database,
  rows: unknown[],
  ingestedAt: Date
): void {
  const iso = ingestedAt.toISOString();
  const stmt = upsertStmt(database);
  const run = database.transaction((list: unknown[]) => {
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const stationId = normalizeStationId(rec.id);
      if (!stationId) continue;
      const sourceFecha = resolveSourceFecha(stationId, rec);
      stmt.run({
        ingested_at: iso,
        station_id: stationId,
        source_fecha: sourceFecha,
        data_json: JSON.stringify(row),
      });
    }
  });
  run(rows);
}

export type HistoryRow = {
  id: number;
  ingested_at: string;
  station_id: string;
  source_fecha: string;
  data: unknown;
};

export function queryHistory(
  database: Database.Database,
  opts: { stationId: string; limit: number; since?: string }
): HistoryRow[] {
  const limit = Math.min(Math.max(1, opts.limit), 5000);
  let sql = `
    SELECT id, ingested_at, station_id, source_fecha, data_json
    FROM weather_readings
    WHERE station_id = ?
  `;
  const params: (string | number)[] = [opts.stationId];
  if (opts.since) {
    sql += ` AND ingested_at >= ?`;
    params.push(opts.since);
  }
  sql += ` ORDER BY ingested_at DESC LIMIT ?`;
  params.push(limit);
  const stmt = database.prepare(sql);
  const raw = stmt.all(...params) as {
    id: number;
    ingested_at: string;
    station_id: string;
    source_fecha: string;
    data_json: string;
  }[];
  return raw.map((r) => ({
    id: r.id,
    ingested_at: r.ingested_at,
    station_id: r.station_id,
    source_fecha: r.source_fecha,
    data: JSON.parse(r.data_json) as unknown,
  }));
}
