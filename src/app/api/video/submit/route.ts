import { z } from "zod";
import { getVideoProvider } from "@/lib/video-provider";
import { composeVideoPrompt } from "@/lib/video-prompt";
import { HttpError, requireGenerationAccess, routeError } from "@/lib/server-auth";
import {
  commitVideoCredit,
  refundVideoCredit,
  reserveVideoCredit,
  videoCreditContext,
} from "@/lib/video-credits";

export const maxDuration = 60;

const bodySchema = z.object({
  prompt: z.string().min(12).max(2_500),
  startImageUrl: z.string().max(8_000_000),
  referenceImageUrls: z.array(z.string().max(8_000_000)).min(1).max(3),
  duration: z.literal(15).default(15),
  clientRequestId: z.string().regex(/^[a-zA-Z0-9_-]{12,200}$/),
});

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const body = bodySchema.parse(await request.json());
    const generationPrompt = composeVideoPrompt(body.prompt);
    const creditsContext = await videoCreditContext();
    const reservation = await reserveVideoCredit(creditsContext, body.clientRequestId);
    if (reservation.reservation !== "created") {
      if (reservation.providerRequestId) {
        const existing = await getVideoProvider().status(reservation.providerRequestId);
        return Response.json({ ...existing, generationPrompt, credits: reservation }, { status: 200 });
      }
      throw new HttpError("This video generation request is already being processed.", 409);
    }
    try {
      const job = await getVideoProvider().submit({ ...body, prompt: generationPrompt });
      let credits = { limit: reservation.limit, used: reservation.used, remaining: reservation.remaining };
      try {
        credits = await commitVideoCredit(creditsContext, body.clientRequestId, job.requestId);
      } catch (creditError) {
        console.error("Video credit commit failed after provider acceptance", creditError);
      }
      return Response.json({ ...job, generationPrompt, credits }, { status: 202 });
    } catch (error) {
      await refundVideoCredit(creditsContext, { clientRequestId: body.clientRequestId }).catch((refundError) => {
        console.error("Video credit refund failed after submission error", refundError);
      });
      throw error;
    }
  } catch (error) {
    return routeError(error);
  }
}
