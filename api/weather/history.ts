import * as http from "node:http";
import { getPool, queryHistory } from "../../lib/weatherRepo.js";

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
    const pool = getPool();
    const stationId = req.query.stationId;
    if (typeof stationId !== "string" || !stationId.trim()) {
      return res.status(400).json({ error: "Missing or invalid stationId" });
    }
    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 200 : 200;
    const since =
      typeof req.query.since === "string" && req.query.since.trim()
        ? req.query.since.trim()
        : undefined;
    const readings = await queryHistory(pool, {
      stationId: stationId.trim(),
      limit,
      since,
    });
    return res.status(200).json({ readings });
  } catch (e) {
    console.error("History query error:", e);
    return res.status(500).json({ error: "Failed to read history" });
  }
}

export const config = { runtime: "nodejs" };
