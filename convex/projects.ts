import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function identityOrThrow(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await identityOrThrow(ctx);
    return ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);
  },
});

export const getMineByClientId = query({
  args: { clientProjectId: v.string() },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    return ctx.db
      .query("projects")
      .withIndex("by_owner_and_client_id", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("clientProjectId", args.clientProjectId),
      )
      .unique();
  },
});

export const saveSnapshot = mutation({
  args: {
    clientProjectId: v.string(),
    productName: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    stage: v.number(),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_owner_and_client_id", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("clientProjectId", args.clientProjectId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        productName: args.productName,
        productUrl: args.productUrl,
        stage: args.stage,
        snapshot: args.snapshot,
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert("projects", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      clientProjectId: args.clientProjectId,
      productName: args.productName,
      productUrl: args.productUrl,
      stage: args.stage,
      snapshot: args.snapshot,
      createdAt: now,
      updatedAt: now,
    });
  },
});
