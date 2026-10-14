import { z } from "zod";
import { creatorsSchema } from "@/lib/schemas";
import { parseStructured } from "@/lib/openai";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.object({
  brief: z.object({
    productName: z.string(),
    audience: z.string(),
    tone: z.string(),
    persona: z.object({
      role: z.string(),
      ageRange: z.string(),
      energy: z.string(),
      setting: z.string(),
      visualDirection: z.string(),
    }),
  }),
});

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const { brief } = bodySchema.parse(await request.json());
    const result = await parseStructured(
      creatorsSchema,
      "cueface_creator_candidates",
      "Design five distinct, plausible UGC creator directions for one social account. Each must feel like a real person, not an influencer cliché. Vary gender presentation and visual archetype. IDs must be creator-1 through creator-5. The characterBible must describe only the person: face, hair, age, skin, build, wardrobe palette, and camera style. Do not include the product, UI, screenshots, devices, props, logos, brand context, real people, or celebrities in any creator field.",
      JSON.stringify(brief),
    );
    return Response.json({
      creators: result.creators.map((creator) => ({
        ...creator,
        imageStatus: "idle" as const,
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}
