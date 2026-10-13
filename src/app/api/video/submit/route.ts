import { z } from "zod";
import { getVideoProvider } from "@/lib/video-provider";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.object({
  prompt: z.string().min(12).max(2_500),
  startImageUrl: z.string().max(8_000_000),
  referenceImageUrls: z.array(z.string().max(8_000_000)).min(1).max(3),
});

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const body = bodySchema.parse(await request.json());
    const job = await getVideoProvider().submit({ ...body, duration: 15 });
    return Response.json(job, { status: 202 });
  } catch (error) {
    return routeError(error);
  }
}
