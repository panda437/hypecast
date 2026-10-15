import { z } from "zod";
import { getVideoProvider } from "@/lib/video-provider";
import { describeRouteError, requireGenerationAccess, routeError } from "@/lib/server-auth";
import { refundVideoCredit, videoCreditContext } from "@/lib/video-credits";

const bodySchema = z.object({ requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/) });

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const { requestId } = bodySchema.parse(await request.json());
    const result = await getVideoProvider().status(requestId);
    if (result.status !== "failed") return Response.json(result);
    console.error("CueFace video generation failed", { requestId, providerError: result.error });
    const context = await videoCreditContext();
    const credits = await refundVideoCredit(context, { providerRequestId: requestId });
    const publicFailure = describeRouteError(Object.assign(new Error(result.error || "Video generation failed"), { status: 502 }));
    return Response.json({
      ...result,
      error: `${publicFailure.error}\n\nWhat you can do: ${publicFailure.action} Your video credit was returned.`,
      credits,
    });
  } catch (error) {
    return routeError(error);
  }
}
