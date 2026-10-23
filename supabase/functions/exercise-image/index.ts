import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const path = new URL(req.url).searchParams.get("path") ?? "";
  // This is a narrow image proxy for the public exercise database, not an open proxy.
  if (path.length > 180 || !/^[A-Za-z0-9_.-]+\/[0-9]+\.jpg$/.test(path)) {
    return new Response("Invalid exercise image path", { status: 400, headers: cors });
  }

  const upstreams = [
    `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${path}`,
    `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${path}`,
  ];

  for (const upstream of upstreams) {
    try {
      const response = await fetch(upstream, { headers: { "User-Agent": "FitMind-Exercise-Image-Proxy/1.0" } });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) continue;
      const headers = new Headers(cors);
      headers.set("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
      const length = response.headers.get("content-length");
      if (length) headers.set("Content-Length", length);
      return new Response(response.body, { status: 200, headers });
    } catch {
      // Try the second fixed upstream.
    }
  }

  return new Response("Exercise image unavailable", { status: 404, headers: { ...cors, "Cache-Control": "no-store" } });
});
