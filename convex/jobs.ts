import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const upsert = mutation({
  args: {
    projectId: v.id("projects"),
    provider: v.string(),
    providerRequestId: v.string(),
    kind: v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    status: v.union(v.literal("queued"), v.literal("generating"), v.literal("ready"), v.literal("failed")),
    resultUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerTokenIdentifier !== identity.tokenIdentifier) throw new Error("Forbidden");
    const existing = await ctx.db
      .query("generationJobs")
      .withIndex("by_provider_request", (q) =>
        q.eq("provider", args.provider).eq("providerRequestId", args.providerRequestId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.ownerTokenIdentifier !== identity.tokenIdentifier) throw new Error("Forbidden");
      await ctx.db.patch(existing._id, { status: args.status, resultUrl: args.resultUrl, error: args.error, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("generationJobs", {
      ...args,
      ownerTokenIdentifier: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
  },
});
