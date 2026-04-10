export const REM_MEASUREMENTS_URL =
  "https://rem.cba.gov.ar/Server/descargas/mediciones_flat.json?nocache";

export async function fetchRemMeasurements(): Promise<unknown[]> {
  const response = await fetch(REM_MEASUREMENTS_URL);
  if (!response.ok) {
    throw new Error(`REM fetch failed: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("REM response is not a JSON array");
  }
  return data;
}
