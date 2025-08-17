import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { trackUsage } from "./lib/usage";
import { getPlatformAdapter } from "./lib/platforms";

export const create = mutation({
  args: {
    userId: v.id("users"),
    platform: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    website: v.string(),
    media: v.optional(v.array(v.string())),
    topics: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    await trackUsage(ctx, args.userId, "products.create", 0.10);
    
    const credentials = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user_platform", q => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();
    
    if (!credentials || !credentials.isActive) {
      throw new Error(`Platform ${args.platform} not connected`);
    }
    
    const adapter = await getPlatformAdapter(args.platform, credentials.credentials);
    const platformResult = await adapter.createProduct({
      id: "",
      name: args.name,
      tagline: args.tagline,
      description: args.description,
      website: args.website,
      media: args.media || []
    });
    
    const productId = await ctx.db.insert("products", {
      userId: args.userId,
      platform: args.platform,
      platformId: platformResult.id,
      name: args.name,
      tagline: args.tagline,
      description: args.description,
      website: args.website,
      url: platformResult.url,
      media: args.media || [],
      topics: args.topics,
      metadata: {}
    });
    
    return {
      id: productId,
      platformId: platformResult.id,
      url: platformResult.url
    };
  }
});

export const list = query({
  args: {
    platform: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", identity.email!))
      .first();
    
    if (!user) return [];
    
    let query = ctx.db.query("products").withIndex("by_user", q => q.eq("userId", user._id));
    
    if (args.platform) {
      const products = await query.collect();
      return products.filter(p => p.platform === args.platform);
    }
    
    return await query.collect();
  }
});

export const get = query({
  args: {
    id: v.id("products"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== args.userId) {
      throw new Error("Product not found");
    }
    
    return product;
  }
});

export const update = mutation({
  args: {
    id: v.id("products"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
    media: v.optional(v.array(v.string())),
    topics: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== args.userId) {
      throw new Error("Product not found");
    }
    
    const { id, userId, ...updates } = args;
    await ctx.db.patch(args.id, updates);
    
    return { success: true };
  }
});

export const remove = mutation({
  args: {
    id: v.id("products"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== args.userId) {
      throw new Error("Product not found");
    }
    
    const launches = await ctx.db
      .query("launches")
      .withIndex("by_product", q => q.eq("productId", args.id))
      .collect();
    
    if (launches.length > 0) {
      throw new Error("Cannot delete product with active launches");
    }
    
    await ctx.db.delete(args.id);
    return { success: true };
  }
});