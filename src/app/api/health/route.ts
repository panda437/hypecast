import { imageModel, textModel } from "@/lib/openai";

export async function GET() {
  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY || !process.env.FAL_KEY);
  return Response.json({
    openai: Boolean(process.env.OPENAI_API_KEY),
    fal: Boolean(process.env.FAL_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    convex: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
    clerk: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    videoProvider: useOpenRouter ? "OpenRouter" : "fal.ai",
    textModel,
    imageModel,
  });
}
