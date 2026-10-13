import { listOpenRouterVideoOptions } from "@/lib/video-provider";
import { routeError } from "@/lib/server-auth";

export async function GET() {
  try {
    return Response.json({ models: await listOpenRouterVideoOptions() });
  } catch (error) {
    return routeError(error);
  }
}
