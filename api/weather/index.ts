import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRemMeasurements } from "../../lib/remIngest";
import { getPool, upsertReadings } from "../../lib/weatherRepo";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
