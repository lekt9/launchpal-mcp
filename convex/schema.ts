import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    apiKey: v.string(),
    subscription: v.string(),
    stripeCustomerId: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    lastLogin: v.optional(v.number()),
    limits: v.object({
      monthlyRequests: v.number(),
      platforms: v.number(),
      products: v.number()
    })
  })
    .index("by_email", ["email"])
    .index("by_api_key", ["apiKey"]),
  
  platformCredentials: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    credentials: v.any(),
    isActive: v.boolean()
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"]),
  
  products: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    platformId: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    website: v.string(),
    url: v.optional(v.string()),
    media: v.array(v.string()),
    topics: v.optional(v.array(v.string())),
    metadata: v.optional(v.any())
  })
    .index("by_user", ["userId"])
    .index("by_platform", ["platform"])
    .index("by_user_platform", ["userId", "platform"]),
  
  launches: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    platform: v.string(),
    platformLaunchId: v.string(),
    scheduledAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    ),
    options: v.optional(v.any())
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"]),
  
  launchMetrics: defineTable({
    launchId: v.id("launches"),
    votes: v.number(),
    comments: v.number(),
    views: v.number(),
    rank: v.number(),
    engagement: v.float64(),
    customMetrics: v.optional(v.any()),
    timestamp: v.number()
  })
    .index("by_launch", ["launchId"])
    .index("by_timestamp", ["timestamp"]),
  
  usage: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    method: v.string(),
    requests: v.number(),
    cost: v.float64(),
    metadata: v.optional(v.any()),
    timestamp: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"]),
  
  apiKeys: defineTable({
    key: v.string(),
    userId: v.id("users"),
    name: v.string(),
    lastUsed: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    scopes: v.array(v.string())
  })
    .index("by_key", ["key"])
    .index("by_user", ["userId"]),
  
  oauthClients: defineTable({
    clientId: v.string(),
    clientSecret: v.string(),
    userId: v.id("users"),
    name: v.string(),
    redirectUris: v.array(v.string()),
    scopes: v.array(v.string())
  })
    .index("by_client_id", ["clientId"])
    .index("by_user", ["userId"]),
  
  oauthCodes: defineTable({
    code: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    scopes: v.array(v.string()),
    expiresAt: v.number()
  })
    .index("by_code", ["code"])
    .index("by_expires", ["expiresAt"])
});