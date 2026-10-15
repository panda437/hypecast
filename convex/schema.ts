import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    ownerTokenIdentifier: v.string(),
    clientProjectId: v.string(),
    productName: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    stage: v.number(),
    snapshot: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_and_client_id", ["ownerTokenIdentifier", "clientProjectId"]),

  assets: defineTable({
    ownerTokenIdentifier: v.string(),
    projectId: v.id("projects"),
    clientAssetId: v.string(),
    kind: v.union(v.literal("candidate"), v.literal("reference"), v.literal("clip"), v.literal("export")),
    provider: v.string(),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_client_id", ["projectId", "clientAssetId"]),

  generationJobs: defineTable({
    ownerTokenIdentifier: v.string(),
    projectId: v.id("projects"),
    provider: v.string(),
    providerRequestId: v.string(),
    kind: v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    status: v.union(
      v.literal("queued"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    resultUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_provider_request", ["provider", "providerRequestId"]),

  videoCreditAccounts: defineTable({
    ownerTokenIdentifier: v.string(),
    limit: v.number(),
    used: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerTokenIdentifier"]),

  videoCreditEvents: defineTable({
    ownerTokenIdentifier: v.string(),
    clientRequestId: v.string(),
    providerRequestId: v.optional(v.string()),
    amount: v.number(),
    status: v.union(v.literal("reserved"), v.literal("charged"), v.literal("refunded")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_and_client_request", ["ownerTokenIdentifier", "clientRequestId"])
    .index("by_owner_and_provider_request", ["ownerTokenIdentifier", "providerRequestId"]),

  reels: defineTable({
    ownerTokenIdentifier: v.string(),
    projectId: v.id("projects"),
    clientReelId: v.string(),
    clipId: v.string(),
    editState: v.any(),
    exportedUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  instagramConnections: defineTable({
    ownerTokenIdentifier: v.string(),
    instagramUserId: v.string(),
    username: v.string(),
    accountType: v.optional(v.string()),
    encryptedAccessToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
    publishingEnabled: v.boolean(),
    connectedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerTokenIdentifier"]),

  instagramPublications: defineTable({
    ownerTokenIdentifier: v.string(),
    publicationId: v.string(),
    clientProjectId: v.string(),
    exportId: v.string(),
    reelId: v.string(),
    caption: v.string(),
    shareToFeed: v.boolean(),
    containerId: v.optional(v.string()),
    instagramMediaId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("published"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_and_publication_id", ["ownerTokenIdentifier", "publicationId"]),

  supportTickets: defineTable({
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
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ticket_id", ["ticketId"])
    .index("by_status", ["status"]),
});
