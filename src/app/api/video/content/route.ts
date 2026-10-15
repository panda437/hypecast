import { HttpError, requireGenerationAccess, routeError } from "@/lib/server-auth";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    await requireGenerationAccess();
    if (!process.env.OPENROUTER_API_KEY) throw new HttpError("AI video playback is temporarily unavailable.", 503, "Try again later or download another ready reel.", "VIDEO_PROVIDER_NOT_CONFIGURED");
    const requestId = new URL(request.url).searchParams.get("requestId") || "";
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(requestId)) throw new HttpError("That video link is invalid.", 400, "Return to the studio and select the video again.", "INVALID_VIDEO_ID");
    const upstream = await fetch(`https://openrouter.ai/api/v1/videos/${requestId}/content?index=0`, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) throw new HttpError("The generated video is not available yet.", upstream.status === 404 ? 404 : 502, "Return to the studio and try the video again shortly.", "VIDEO_CONTENT_UNAVAILABLE");
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="cueface-${requestId}.mp4"`,
    });
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(upstream.body, { headers });
  } catch (error) {
    return routeError(error);
  }
}
