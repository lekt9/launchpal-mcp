import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { trackUsage } from "./lib/usage";
import { getPlatformAdapter } from "./lib/platforms";

export const schedule = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    scheduledAt: v.number(),
    options: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await trackUsage(ctx, args.userId, "launches.schedule", 0.05);
    
    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== args.userId) {
      throw new Error("Product not found");
    }
    
    const credentials = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user_platform", q => 
        q.eq("userId", args.userId).eq("platform", product.platform)
      )
      .first();
    
    if (!credentials || !credentials.isActive) {
      throw new Error(`Platform ${product.platform} not connected`);
    }
    
    const adapter = await getPlatformAdapter(product.platform, credentials.credentials);
    const platformLaunch = await adapter.scheduleLaunch(
      product.platformId,
      new Date(args.scheduledAt)
    );
    
    const launchId = await ctx.db.insert("launches", {
      userId: args.userId,
      productId: args.productId,
      platform: product.platform,
      platformLaunchId: platformLaunch.id,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      options: args.options
    });
    
    return {
      id: launchId,
      status: "scheduled",
      scheduledAt: args.scheduledAt
    };
  }
});

export const getMetrics = action({
  args: {
    userId: v.id("users"),
    launchId: v.id("launches")
  },
  handler: async (ctx, args) => {
    const launch = await ctx.runQuery(api.launches.get, { 
      id: args.launchId, 
      userId: args.userId 
    });
    
    if (!launch) {
      throw new Error("Launch not found");
    }
    
    const credentials = await ctx.runQuery(api.platforms.getCredentials, {
      userId: args.userId,
      platform: launch.platform
    });
    
    if (!credentials) {
      throw new Error("Platform credentials not found");
    }
    
    const adapter = await getPlatformAdapter(launch.platform, credentials.credentials);
    const metrics = await adapter.getLaunchMetrics(launch.platformLaunchId);
    
    await ctx.runMutation(api.launches.saveMetrics, {
      launchId: args.launchId,
      metrics
    });
    
    return metrics;
  }
});

export const saveMetrics = mutation({
  args: {
    launchId: v.id("launches"),
    metrics: v.object({
      votes: v.optional(v.number()),
      comments: v.optional(v.number()),
      views: v.optional(v.number()),
      rank: v.optional(v.number()),
      engagement: v.optional(v.float64()),
      customMetrics: v.optional(v.any())
    })
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("launchMetrics", {
      launchId: args.launchId,
      votes: args.metrics.votes || 0,
      comments: args.metrics.comments || 0,
      views: args.metrics.views || 0,
      rank: args.metrics.rank || 0,
      engagement: args.metrics.engagement || 0,
      customMetrics: args.metrics.customMetrics,
      timestamp: Date.now()
    });
  }
});

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    ))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", identity.email!))
      .first();
    
    if (!user) return [];
    
    let query = ctx.db.query("launches").withIndex("by_user", q => q.eq("userId", user._id));
    
    if (args.status) {
      const launches = await query.collect();
      return launches.filter(l => l.status === args.status);
    }
    
    return await query.collect();
  }
});

export const get = query({
  args: {
    id: v.id("launches"),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const launch = await ctx.db.get(args.id);
    if (!launch || launch.userId !== args.userId) {
      throw new Error("Launch not found");
    }
    
    return launch;
  }
});

export const updateStatus = mutation({
  args: {
    id: v.id("launches"),
    userId: v.id("users"),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    )
  },
  handler: async (ctx, args) => {
    const launch = await ctx.db.get(args.id);
    if (!launch || launch.userId !== args.userId) {
      throw new Error("Launch not found");
    }
    
    await ctx.db.patch(args.id, { status: args.status });
    
    return { success: true };
  }
});