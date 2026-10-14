import { z } from "zod";
import { editPortrait, generatePortrait } from "@/lib/openai";
import { candidatePortraitPrompt, referencePortraitPrompt } from "@/lib/portrait-standard";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("candidate"),
    name: z.string().max(80),
    characterBible: z.string().max(2_500),
  }),
  z.object({
    kind: z.literal("reference"),
    name: z.string().max(80),
    characterBible: z.string().max(2_500),
    direction: z.string().max(800),
    sourceDataUrl: z.string().max(8_000_000),
  }),
]);

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const body = bodySchema.parse(await request.json());
    if (body.kind === "candidate") {
      const imageDataUrl = await generatePortrait(candidatePortraitPrompt(body.name, body.characterBible));
      return Response.json({ imageDataUrl });
    }
    const imageDataUrl = await editPortrait(
      body.sourceDataUrl,
      referencePortraitPrompt(body.name, body.characterBible, body.direction),
    );
    return Response.json({ imageDataUrl });
  } catch (error) {
    return routeError(error);
  }
}
