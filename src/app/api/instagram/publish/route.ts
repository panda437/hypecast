import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { assertPublicUrl } from "@/lib/url-safety";
import {
  authenticatedConvex,
  createInstagramReelContainer,
  instagramConfigured,
  instagramPublishingEnabled,
  usableInstagramConnection,
} from "@/lib/instagram-server";
import { HttpError, routeError } from "@/lib/server-auth";
import type { WorkspaceSnapshot } from "@/lib/types";

export const maxDuration = 60;

const bodySchema = z.object({
  clientProjectId: z.string().min(1).max(200),
  exportId: z.string().min(1).max(200),
  caption: z.string().max(2_200),
  shareToFeed: z.boolean().default(true),
});

export async function POST(request: Request) {
  let publicationId: string | undefined;
  try {
    if (!instagramPublishingEnabled()) throw new HttpError("Instagram publishing is currently paused.", 503);
    if (!instagramConfigured()) throw new HttpError("Instagram publishing is not configured yet.", 503);
    const body = bodySchema.parse(await request.json());
    const { client } = await authenticatedConvex();
    const [project, connection] = await Promise.all([
      client.query(api.projects.getMineByClientId, { clientProjectId: body.clientProjectId }),
      usableInstagramConnection(client),
    ]);
    if (!project) throw new HttpError("Project not found.", 404);
    const snapshot = project.snapshot as WorkspaceSnapshot;
    const exported = snapshot.exports.find((item) => item.id === body.exportId && item.status === "saved" && item.url);
    if (!exported?.url) throw new HttpError("Wait for the reel to finish saving to the cloud before publishing.", 409);
    const videoUrl = (await assertPublicUrl(exported.url)).toString();
    publicationId = crypto.randomUUID();
    await client.mutation(api.instagram.createPublication, {
      publicationId,
      clientProjectId: body.clientProjectId,
      exportId: exported.id,
      reelId: exported.reelId,
      caption: body.caption,
      shareToFeed: body.shareToFeed,
    });
    const container = await createInstagramReelContainer({
      instagramUserId: connection.instagramUserId,
      accessToken: connection.accessToken,
      videoUrl,
      caption: body.caption,
      shareToFeed: body.shareToFeed,
    });
    await client.mutation(api.instagram.updatePublication, {
      publicationId,
      status: "processing",
      containerId: container.id,
    });
    return Response.json({ publicationId, status: "processing" }, { status: 202 });
  } catch (error) {
    if (publicationId) {
      try {
        const { client } = await authenticatedConvex();
        await client.mutation(api.instagram.updatePublication, {
          publicationId,
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 500) : "Instagram publishing failed.",
        });
      } catch {
        // Preserve the original publishing error.
      }
    }
    return routeError(error);
  }
}
