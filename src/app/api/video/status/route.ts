import { z } from "zod";
import { getVideoProvider } from "@/lib/video-provider";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";
import { refundVideoCredit, videoCreditContext } from "@/lib/video-credits";

const bodySchema = z.object({ requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/) });

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const { requestId } = bodySchema.parse(await request.json());
    const result = await getVideoProvider().status(requestId);
    if (result.status !== "failed") return Response.json(result);
    const context = await videoCreditContext();
    const credits = await refundVideoCredit(context, { providerRequestId: requestId });
    return Response.json({ ...result, credits });
  } catch (error) {
    return routeError(error);
  }
}
