import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function identityOrThrow(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await identityOrThrow(ctx);
    const connection = await ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!connection) return null;
    return {
      instagramUserId: connection.instagramUserId,
      username: connection.username,
      accountType: connection.accountType,
      publishingEnabled: connection.publishingEnabled,
      connectedAt: connection.connectedAt,
      tokenExpiresAt: connection.tokenExpiresAt,
    };
  },
});

export const getSecretMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await identityOrThrow(ctx);
    return ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const upsertMine = mutation({
  args: {
    instagramUserId: v.string(),
    username: v.string(),
    accountType: v.optional(v.string()),
    encryptedAccessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, publishingEnabled: true, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("instagramConnections", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      ...args,
      publishingEnabled: true,
      connectedAt: now,
      updatedAt: now,
    });
  },
});

export const updateEncryptedToken = mutation({
  args: {
    encryptedAccessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!existing) throw new Error("Instagram is not connected");
    await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
  },
});

export const setPublishingEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!existing) throw new Error("Instagram is not connected");
    await ctx.db.patch(existing._id, { publishingEnabled: args.enabled, updatedAt: Date.now() });
  },
});

export const disconnectMine = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("instagramConnections")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const createPublication = mutation({
  args: {
    publicationId: v.string(),
    clientProjectId: v.string(),
    exportId: v.string(),
    reelId: v.string(),
    caption: v.string(),
    shareToFeed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const now = Date.now();
    await ctx.db.insert("instagramPublications", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      ...args,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getPublication = query({
  args: { publicationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    return ctx.db
      .query("instagramPublications")
      .withIndex("by_owner_and_publication_id", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("publicationId", args.publicationId),
      )
      .unique();
  },
});

export const updatePublication = mutation({
  args: {
    publicationId: v.string(),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("published"), v.literal("failed")),
    containerId: v.optional(v.string()),
    instagramMediaId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const publication = await ctx.db
      .query("instagramPublications")
      .withIndex("by_owner_and_publication_id", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("publicationId", args.publicationId),
      )
      .unique();
    if (!publication) throw new Error("Publication not found");
    await ctx.db.patch(publication._id, {
      status: args.status,
      containerId: args.containerId,
      instagramMediaId: args.instagramMediaId,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});
