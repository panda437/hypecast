import { z } from "zod";
import { hooksSchema } from "@/lib/schemas";
import { parseStructured } from "@/lib/openai";
import { HttpError, requireGenerationAccess, routeError } from "@/lib/server-auth";
import { STORY_SYSTEM_PROMPT, storyBatchIssues } from "@/lib/story-standard";

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
    let result = await parseStructured(
      hooksSchema,
      "cueface_reel_stories",
      STORY_SYSTEM_PROMPT,
      JSON.stringify(brief),
    );
    const issues = storyBatchIssues(result.hooks, brief.productName);
    if (issues.length) {
      result = await parseStructured(
        hooksSchema,
        "cueface_reel_stories_repaired",
        `${STORY_SYSTEM_PROMPT}

REPAIR PASS
The prior draft violated the personal-story standard. Rewrite the complete batch, fixing every listed issue. Do not defend or minimally patch the old draft. Keep the human experience coherent and push the product further into the background.`,
        JSON.stringify({ brief, priorDraft: result.hooks, issues }),
      );
      const remainingIssues = storyBatchIssues(result.hooks, brief.productName);
      if (remainingIssues.length) {
        throw new HttpError(
          "CueFace could not produce a usable personal-story batch.",
          502,
          "Choose Rewrite batch to try again. Your existing stories remain saved.",
          "STORY_STANDARD_NOT_MET",
        );
      }
    }
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
