import { Agent, fetch as undiciFetch } from "undici";

export const REM_MEASUREMENTS_URL =
  "https://rem.cba.gov.ar/Server/descargas/mediciones_flat.json?nocache";

/** REM is often slow; Vercel's default undici connect timeout is 10s and times out first. */
const remAgent = new Agent({
  connectTimeout: 60_000,
  headersTimeout: 60_000,
  bodyTimeout: 120_000,
});

const REM_HEADERS = {
  "User-Agent": "weatherapp-ingest/1.0",
  Accept: "application/json",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchRemMeasurements(): Promise<unknown[]> {
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await undiciFetch(REM_MEASUREMENTS_URL, {
        dispatcher: remAgent,
        headers: REM_HEADERS,
      });
      if (!response.ok) {
        throw new Error(`REM fetch failed: ${response.status}`);
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("REM response is not a JSON array");
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await sleep(1500 * attempt);
      }
    }
  }

  throw lastErr;
}
