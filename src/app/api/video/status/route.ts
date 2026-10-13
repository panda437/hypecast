import { z } from "zod";
import { getVideoProvider } from "@/lib/video-provider";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

const bodySchema = z.object({ requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/) });

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const { requestId } = bodySchema.parse(await request.json());
    return Response.json(await getVideoProvider().status(requestId));
  } catch (error) {
    return routeError(error);
  }
}
