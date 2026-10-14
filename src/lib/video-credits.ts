import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { HttpError } from "./server-auth";

export type VideoCreditBalance = {
  limit: number;
  used: number;
  remaining: number;
};

type VideoCreditContext = { client: ConvexHttpClient | null };

const LOCAL_BALANCE: VideoCreditBalance = { limit: 100, used: 0, remaining: 100 };

export async function videoCreditContext(): Promise<VideoCreditContext> {
  if (!process.env.CLERK_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new HttpError("Video credits are unavailable until authentication is configured.", 503);
    }
    return { client: null };
  }
  const session = await auth();
  if (!session.userId) throw new HttpError("Sign in before generating video.", 401);
  const token = await session.getToken({ template: "convex" });
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new HttpError("Video credit storage is not configured.", 503);
  }
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth(token);
  return { client };
}

export async function readVideoCredits(context: VideoCreditContext) {
  return context.client ? context.client.query(api.videoCredits.getMine, {}) : LOCAL_BALANCE;
}

export async function reserveVideoCredit(context: VideoCreditContext, clientRequestId: string) {
  if (!context.client) return { ...LOCAL_BALANCE, used: 1, remaining: 99, reservation: "created" as const };
  try {
    return await context.client.mutation(api.videoCredits.reserveOne, { clientRequestId });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NO_VIDEO_CREDITS")) {
      throw new HttpError("You have used all 100 video credits in your current allowance.", 402);
    }
    throw error;
  }
}

export async function commitVideoCredit(
  context: VideoCreditContext,
  clientRequestId: string,
  providerRequestId: string,
) {
  if (!context.client) return { ...LOCAL_BALANCE, used: 1, remaining: 99 };
  return context.client.mutation(api.videoCredits.commitOne, { clientRequestId, providerRequestId });
}

export async function refundVideoCredit(
  context: VideoCreditContext,
  request: { clientRequestId?: string; providerRequestId?: string },
) {
  if (!context.client) return LOCAL_BALANCE;
  return context.client.mutation(api.videoCredits.refundOne, request);
}
