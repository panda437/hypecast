import { z } from "zod";
import { createDemoBrief } from "@/lib/demo-brief";
import { routeError } from "@/lib/server-auth";
import { extractPublicPage } from "@/lib/url-safety";

export const maxDuration = 20;

const bodySchema = z.object({ url: z.string().url().max(2_000) });

export async function POST(request: Request) {
  try {
    const { url } = bodySchema.parse(await request.json());
    const page = await extractPublicPage(url);
    return Response.json(
      { brief: createDemoBrief(page) },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (error) {
    return routeError(error);
  }
}
