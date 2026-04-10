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
  const auth = req.headers.authorization;
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const data = await fetchRemMeasurements();
    const pool = getPool();
    await upsertReadings(pool, data, new Date());
    return res.status(200).json({ ok: true, stations: data.length });
  } catch (e) {
    console.error("Cron ingest error:", e);
    return res.status(500).json({ error: "Ingest failed" });
  }
}

export const config = { runtime: "nodejs" };
