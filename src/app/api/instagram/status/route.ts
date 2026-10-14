import { api } from "../../../../../convex/_generated/api";
import { connection } from "next/server";
import { authenticatedConvex, instagramConfigured, instagramPublishingEnabled } from "@/lib/instagram-server";
import { routeError } from "@/lib/server-auth";

export async function GET() {
  await connection();
  try {
    const globallyEnabled = instagramPublishingEnabled();
    const configured = instagramConfigured();
    const { client } = await authenticatedConvex();
    const connection = await client.query(api.instagram.getMine, {});
    return Response.json({
      globallyEnabled,
      configured,
      connection: connection ? { connected: true, ...connection } : { connected: false, publishingEnabled: false },
    });
  } catch (error) {
    return routeError(error);
  }
}
