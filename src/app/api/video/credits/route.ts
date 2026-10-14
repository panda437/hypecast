import { readVideoCredits, videoCreditContext } from "@/lib/video-credits";
import { routeError } from "@/lib/server-auth";

export async function GET(request: Request) {
  request.headers.get("cookie");
  try {
    const context = await videoCreditContext();
    return Response.json(await readVideoCredits(context));
  } catch (error) {
    return routeError(error);
  }
}
