import { connection, NextRequest } from "next/server";
import { advanceInstagramPublication, authenticatedConvex, instagramPublishingEnabled } from "@/lib/instagram-server";
import { HttpError, routeError } from "@/lib/server-auth";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  await connection();
  try {
    if (!instagramPublishingEnabled()) throw new HttpError("Instagram publishing is currently paused.", 503);
    const publicationId = request.nextUrl.searchParams.get("publicationId");
    if (!publicationId) throw new HttpError("Missing Instagram publication ID.");
    const { client } = await authenticatedConvex();
    const publication = await advanceInstagramPublication(client, publicationId);
    return Response.json({
      publicationId,
      status: publication.status,
      instagramMediaId: publication.instagramMediaId,
      error: publication.error,
    });
  } catch (error) {
    return routeError(error);
  }
}
