import * as http from "node:http";
import { fetchRemMeasurements } from "../../lib/remIngest.js";
import { getPool, upsertReadings } from "../../lib/weatherRepo.js";

/** Keep `http` referenced so @vercel/nft traces this file (import type breaks tracing). */
void http;

type VercelRequest = http.IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
};

type VercelResponse = http.ServerResponse & {
  send: (body: unknown) => VercelResponse;
  json: (jsonBody: unknown) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};

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
