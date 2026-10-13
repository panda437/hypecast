import { requireGenerationAccess, routeError } from "@/lib/server-auth";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    await requireGenerationAccess();
    if (!process.env.OPENROUTER_API_KEY) throw new Error("OpenRouter is not configured.");
    const requestId = new URL(request.url).searchParams.get("requestId") || "";
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(requestId)) throw new Error("Invalid video request ID.");
    const upstream = await fetch(`https://openrouter.ai/api/v1/videos/${requestId}/content?index=0`, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) throw new Error("The generated video is not available.");
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="hypecast-${requestId}.mp4"`,
    });
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(upstream.body, { headers });
  } catch (error) {
    return routeError(error);
  }
}
