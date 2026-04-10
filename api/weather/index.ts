import * as http from "node:http";
import { fetchRemMeasurements } from "../../lib/remIngest.js";
import { getPool, upsertReadings } from "../../lib/weatherRepo.js";

/**
 * Vercel bundles API routes with @vercel/nft. Typed handler params, `import type`, and
 * `globalThis as typeof globalThis` in dependencies can prevent tracing `lib/` (runtime
 * ERR_MODULE_NOT_FOUND). Keep `http` imported for Node; leave `req`/`res` untyped.
 */
void http;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const data = await fetchRemMeasurements();
    try {
      const pool = getPool();
      await upsertReadings(pool, data, new Date());
    } catch (persistErr) {
      console.error("Weather DB persist error:", persistErr);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch weather data" });
  }
}

export const config = { runtime: "nodejs" };
