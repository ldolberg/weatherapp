import { createHash } from "crypto";

export function normalizeStationId(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

/** When REM omits fecha, one stable row per distinct payload per station. */
export function syntheticSourceFecha(stationId: string, row: unknown): string {
  const h = createHash("sha256")
    .update(JSON.stringify(row))
    .digest("hex")
    .slice(0, 16);
  return `unknown:${stationId}:${h}`;
}

export function resolveSourceFecha(
  stationId: string,
  row: Record<string, unknown>
): string {
  const fecha = row.fecha;
  if (typeof fecha === "string" && fecha.trim() !== "") return fecha.trim();
  return syntheticSourceFecha(stationId, row);
}
