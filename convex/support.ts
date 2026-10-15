import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const submit = mutation({
  args: {
    secret: v.string(),
    ticketId: v.string(),
    clerkUserId: v.optional(v.string()),
    email: v.string(),
    category: v.union(
      v.literal("bug"),
      v.literal("generation"),
      v.literal("account"),
      v.literal("question"),
    ),
    message: v.string(),
    projectId: v.optional(v.string()),
    productName: v.optional(v.string()),
    recentError: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.SUPPORT_TICKET_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) throw new Error("Forbidden");

    const existing = await ctx.db
      .query("supportTickets")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .unique();
    if (existing) return { ticketId: existing.ticketId };

    const now = Date.now();
    const { secret: _secret, ...ticket } = args;
    void _secret;
    await ctx.db.insert("supportTickets", {
      ...ticket,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    return { ticketId: args.ticketId };
  },
});
