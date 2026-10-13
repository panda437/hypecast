import { z } from "zod";
import { hooksSchema } from "@/lib/schemas";
import { parseStructured } from "@/lib/openai";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.object({
  productName: z.string(),
  oneLiner: z.string(),
  audience: z.string(),
  problem: z.string(),
  differentiators: z.array(z.string()),
  proofPoints: z.array(z.string()),
  hookAngles: z.array(z.string()),
  tone: z.string(),
});

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const brief = bodySchema.parse(await request.json());
    const result = await parseStructured(
      hooksSchema,
      "hypecast_reel_hooks",
      "Write five silent Instagram Reel text stories grounded only in the supplied product brief. Each hook must stop a founder or target user's scroll, remain readable in about five seconds, and avoid unsupported claims. The followUp adds one short sentence of context. Vary the angle: POV, confession, contrarian observation, problem recognition, and outcome. No hashtags, emoji, or quotation marks.",
      JSON.stringify(brief),
    );
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
