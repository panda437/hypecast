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
      "hypecast_reel_stories",
      `Write five distinct static-text Instagram Reel stories for the supplied product.

STYLE STANDARD
- Write like a native internet story, confession, or piece of gossip—not an ad.
- Choose a world and situation native to the product and audience. It may be workplace drama for a B2B tool, but it could just as naturally be a relationship, routine, money decision, hobby, trip, health habit, creator problem, or everyday social moment. Never force every product into an office story.
- Use lowercase, conversational language and restrained punctuation.
- Open immediately with a specific uncomfortable, unfair, or absurd situation.
- Escalate through 3–5 concrete details that make the situation feel observed.
- Introduce the product naturally in the middle as the one thing that quietly works or reveals the truth. Never make it sound like a sponsor break.
- End with a short, sharp reversal that reinterprets the whole story.
- Each story must be 80–145 words and remain one continuous static text overlay for all 15 seconds.
- Vary the narrative situation across all five stories. Give each a short editorial title and a one-line angle label.

TRUTH RULES
- Product capabilities and benefits must be grounded only in the supplied brief.
- The narrative setup may be a clearly illustrative scenario, but do not invent customers, metrics, awards, quotes, or integrations.
- No hashtags, emoji, quotation marks, direct calls to action, link-in-bio lines, generic hype, or marketing adjectives.
- Do not reuse the wording, characters, or incidents from any reference examples.

The intended rhythm is: specific incident → escalating specifics → natural product role → memorable final reversal. Return exactly the requested schema.`,
      JSON.stringify(brief),
    );
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
