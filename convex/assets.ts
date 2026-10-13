import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.storage.generateUploadUrl();
  },
});

export const saveGenerated = mutation({
  args: {
    projectId: v.id("projects"),
    clientAssetId: v.string(),
    kind: v.union(v.literal("candidate"), v.literal("reference"), v.literal("clip"), v.literal("export")),
    provider: v.string(),
    storageId: v.id("_storage"),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerTokenIdentifier !== identity.tokenIdentifier) throw new Error("Forbidden");
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Stored asset is unavailable");
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_project_and_client_id", (q) =>
        q.eq("projectId", args.projectId).eq("clientAssetId", args.clientAssetId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { storageId: args.storageId, url, metadata: args.metadata });
    } else {
      await ctx.db.insert("assets", {
        ...args,
        ownerTokenIdentifier: identity.tokenIdentifier,
        url,
        createdAt: Date.now(),
      });
    }
    return url;
  },
});
