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
      // #region agent log
      fetch("http://127.0.0.1:7859/ingest/ed4fb8ac-2b0b-47a2-9902-2dc3378c2646", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "b98535",
        },
        body: JSON.stringify({
          sessionId: "b98535",
          location: "lib/remIngest.ts:catch",
          message: "REM fetch attempt failed",
          data: {
            attempt,
            maxAttempts,
            name: e instanceof Error ? e.name : "unknown",
            message: e instanceof Error ? e.message.slice(0, 200) : String(e),
            causeCode:
              e instanceof Error && e.cause && typeof e.cause === "object" && "code" in e.cause
                ? String((e.cause as { code?: string }).code)
                : undefined,
          },
          timestamp: Date.now(),
          hypothesisId: "H-connect-timeout-retries",
        }),
      }).catch(() => {});
      // #endregion
      if (attempt < maxAttempts) {
        await sleep(1500 * attempt);
      }
    }
  }

  throw lastErr;
}
