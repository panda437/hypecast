import { z } from "zod";
import { briefSchema } from "@/lib/schemas";
import { extractPublicPage } from "@/lib/url-safety";
import { parseStructured } from "@/lib/openai";
import { requireGenerationAccess, routeError } from "@/lib/server-auth";

export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().url().max(2_000) });

export async function POST(request: Request) {
  try {
    await requireGenerationAccess();
    const { url } = bodySchema.parse(await request.json());
    const page = await extractPublicPage(url);
    const brief = await parseStructured(
      briefSchema,
      "hypecast_product_brief",
      "You are a careful product marketer. Ground every claim in supplied page evidence. Do not invent traction, customers, features, or outcomes. Write concise, editable material for silent short-form video. Return exactly the requested schema.",
      JSON.stringify(page),
    );
    return Response.json({
      brief: {
        ...brief,
        source: {
          url: page.url,
          title: page.title,
          description: page.description,
          excerpt: page.body.slice(0, 520),
        },
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
