import { Readable } from "node:stream";
import worker from "../dist/server/index.js";

export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  const url = new URL(req.url || "/", origin);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const request = new Request(url, {
    method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });

  const response = await worker.fetch(request, {}, {});

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
}
