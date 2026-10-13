import { z } from "zod";
import { editPortrait, generatePortrait } from "@/lib/openai";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("candidate"),
    name: z.string().max(80),
    characterBible: z.string().max(2_500),
    productName: z.string().max(160),
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
      const imageDataUrl = await generatePortrait(
        `Create a photorealistic vertical UGC creator casting portrait for ${body.productName}. ${body.characterBible}. Medium shot, direct natural eye contact, soft window daylight, lived-in neutral workspace, 35mm phone-camera realism, natural skin texture, relaxed posture, no logos, no text, no watermark, no beauty-ad retouching. This is a fictional adult creator, not a real person.`,
      );
      return Response.json({ imageDataUrl });
    }
    const imageDataUrl = await editPortrait(
      body.sourceDataUrl,
      `Keep the exact same fictional person and preserve facial identity, hair, age, skin tone, build, and wardrobe palette from the input. ${body.characterBible}. New shot direction: ${body.direction}. Photorealistic 9:16 UGC still, natural motion-ready pose, soft daylight, phone-camera realism, no text, no logos, no watermark.`,
    );
    return Response.json({ imageDataUrl });
  } catch (error) {
    return routeError(error);
  }
}
