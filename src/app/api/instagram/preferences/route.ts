import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { authenticatedConvex } from "@/lib/instagram-server";
import { routeError } from "@/lib/server-auth";

const bodySchema = z.object({ enabled: z.boolean() });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { client } = await authenticatedConvex();
    await client.mutation(api.instagram.setPublishingEnabled, body);
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE() {
  try {
    const { client } = await authenticatedConvex();
    await client.mutation(api.instagram.disconnectMine, {});
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
