import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

const DEFAULT_VIDEO_CREDIT_LIMIT = 100;

async function identityOrThrow(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

function balance(account: { limit: number; used: number }) {
  return {
    limit: account.limit,
    used: account.used,
    remaining: Math.max(0, account.limit - account.used),
  };
}

async function findAccount(ctx: MutationCtx, ownerTokenIdentifier: string) {
  return ctx.db
    .query("videoCreditAccounts")
    .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", ownerTokenIdentifier))
    .unique();
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await identityOrThrow(ctx);
    const account = await ctx.db
      .query("videoCreditAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .unique();
    return balance(account || { limit: DEFAULT_VIDEO_CREDIT_LIMIT, used: 0 });
  },
});

export const reserveOne = mutation({
  args: { clientRequestId: v.string() },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const existing = await ctx.db
      .query("videoCreditEvents")
      .withIndex("by_owner_and_client_request", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    const current = await findAccount(ctx, identity.tokenIdentifier);
    if (existing) {
      return {
        ...balance(current || { limit: DEFAULT_VIDEO_CREDIT_LIMIT, used: existing.status === "refunded" ? 0 : 1 }),
        reservation: existing.status,
        providerRequestId: existing.providerRequestId,
      };
    }

    const now = Date.now();
    const account = current || {
      limit: DEFAULT_VIDEO_CREDIT_LIMIT,
      used: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (account.used >= account.limit) throw new Error("NO_VIDEO_CREDITS");
    const next = { limit: account.limit, used: account.used + 1 };
    if (current) {
      await ctx.db.patch(current._id, { used: next.used, updatedAt: now });
    } else {
      await ctx.db.insert("videoCreditAccounts", {
        ownerTokenIdentifier: identity.tokenIdentifier,
        ...next,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("videoCreditEvents", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      clientRequestId: args.clientRequestId,
      amount: 1,
      status: "reserved",
      createdAt: now,
      updatedAt: now,
    });
    return { ...balance(next), reservation: "created" as const };
  },
});

export const commitOne = mutation({
  args: { clientRequestId: v.string(), providerRequestId: v.string() },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    const event = await ctx.db
      .query("videoCreditEvents")
      .withIndex("by_owner_and_client_request", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (!event) throw new Error("VIDEO_CREDIT_RESERVATION_NOT_FOUND");
    if (event.status === "refunded") throw new Error("VIDEO_CREDIT_ALREADY_REFUNDED");
    await ctx.db.patch(event._id, {
      providerRequestId: args.providerRequestId,
      status: "charged",
      updatedAt: Date.now(),
    });
    const account = await findAccount(ctx, identity.tokenIdentifier);
    return balance(account || { limit: DEFAULT_VIDEO_CREDIT_LIMIT, used: 1 });
  },
});

export const refundOne = mutation({
  args: {
    clientRequestId: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx);
    if (!args.clientRequestId && !args.providerRequestId) throw new Error("A request ID is required");
    const event = args.clientRequestId
      ? await ctx.db
          .query("videoCreditEvents")
          .withIndex("by_owner_and_client_request", (q) =>
            q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("clientRequestId", args.clientRequestId as string),
          )
          .unique()
      : await ctx.db
          .query("videoCreditEvents")
          .withIndex("by_owner_and_provider_request", (q) =>
            q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("providerRequestId", args.providerRequestId),
          )
          .unique();
    const account = await findAccount(ctx, identity.tokenIdentifier);
    if (!event || event.status === "refunded") {
      return balance(account || { limit: DEFAULT_VIDEO_CREDIT_LIMIT, used: 0 });
    }
    const nextUsed = Math.max(0, (account?.used || 0) - event.amount);
    if (account) await ctx.db.patch(account._id, { used: nextUsed, updatedAt: Date.now() });
    await ctx.db.patch(event._id, { status: "refunded", updatedAt: Date.now() });
    return balance({ limit: account?.limit || DEFAULT_VIDEO_CREDIT_LIMIT, used: nextUsed });
  },
});
