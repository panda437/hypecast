import { selectOpenRouterVideoOption } from "@/lib/video-provider";
import { routeError } from "@/lib/server-auth";

export async function GET() {
  try {
    await selectOpenRouterVideoOption();
    return Response.json({ available: true });
  } catch (error) {
    return routeError(error);
  }
}
