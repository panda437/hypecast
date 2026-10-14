import { listOpenRouterVideoOptions, openRouterVideoPriceCap, selectOpenRouterVideoOption } from "@/lib/video-provider";
import { routeError } from "@/lib/server-auth";

export async function GET() {
  try {
    const [models, selected] = await Promise.all([
      listOpenRouterVideoOptions(),
      selectOpenRouterVideoOption(),
    ]);
    return Response.json({ models, selected, maxPerSecondUsd: openRouterVideoPriceCap() });
  } catch (error) {
    return routeError(error);
  }
}
