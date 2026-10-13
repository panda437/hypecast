import { z } from "zod";

export const briefSchema = z.object({
  productName: z.string(),
  oneLiner: z.string(),
  audience: z.string(),
  problem: z.string(),
  differentiators: z.array(z.string()).length(3),
  proofPoints: z.array(z.string()).min(1).max(4),
  tone: z.string(),
  persona: z.object({
    role: z.string(),
    ageRange: z.string(),
    energy: z.string(),
    setting: z.string(),
    visualDirection: z.string(),
  }),
  hookAngles: z.array(z.string()).length(5),
});

export const creatorsSchema = z.object({
  creators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      archetype: z.string(),
      description: z.string(),
      energy: z.string(),
      wardrobe: z.string(),
      setting: z.string(),
      characterBible: z.string(),
    }),
  ).length(5),
});

export const hooksSchema = z.object({
  hooks: z.array(
    z.object({
      title: z.string(),
      hook: z.string(),
      followUp: z.string(),
    }),
  ).length(5),
});
