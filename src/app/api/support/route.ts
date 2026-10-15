import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { HttpError, routeError } from "@/lib/server-auth";

const supportSchema = z.object({
  email: z.string().email().max(200),
  category: z.enum(["bug", "generation", "account", "question"]),
  message: z.string().trim().min(10).max(2000),
  projectId: z.string().max(200).optional(),
  productName: z.string().max(200).optional(),
  recentError: z.string().max(2000).optional(),
  pageUrl: z.string().max(1000).optional(),
  userAgent: z.string().max(1000).optional(),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const input = supportSchema.parse(await request.json());

    // Quietly accept bot submissions caught by the hidden honeypot field.
    if (input.website) return Response.json({ ticketId: "received" }, { status: 201 });

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const secret = process.env.SUPPORT_TICKET_SECRET;
    if (!convexUrl || !secret) {
      throw new HttpError(
        "Support ticket submission is temporarily unavailable.",
        503,
        "Try again shortly. Your project and recent error remain saved.",
        "SUPPORT_NOT_CONFIGURED",
      );
    }

    let clerkUserId: string | undefined;
    if (process.env.CLERK_SECRET_KEY) {
      const session = await auth();
      clerkUserId = session.userId || undefined;
    }

    const ticketId = `cue-${crypto.randomUUID()}`;
    const client = new ConvexHttpClient(convexUrl);
    await client.mutation(api.support.submit, {
      secret,
      ticketId,
      clerkUserId,
      email: input.email,
      category: input.category,
      message: input.message,
      projectId: input.projectId,
      productName: input.productName,
      recentError: input.recentError,
      pageUrl: input.pageUrl,
      userAgent: input.userAgent,
    });

    return Response.json({ ticketId }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
