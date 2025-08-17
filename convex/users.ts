import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();
  }
});

export const updateSubscription = mutation({
  args: {
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    subscription: v.string(),
    limits: v.object({
      monthlyRequests: v.number(),
      platforms: v.number(),
      products: v.number()
    })
  },
  handler: async (ctx, args) => {
    let user;
    
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", q => q.eq("email", args.email!))
        .first();
    } else {
      throw new Error("Either userId or email must be provided");
    }
    
    if (!user) throw new Error("User not found");
    
    await ctx.db.patch(user._id, {
      subscription: args.subscription,
      limits: args.limits
    });
    
    return { success: true };
  }
});

export const regenerateApiKey = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const newApiKey = generateApiKey();
    
    await ctx.db.patch(args.userId, {
      apiKey: newApiKey
    });
    
    return { apiKey: newApiKey };
  }
});

export const getProfile = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    
    // Get usage stats
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .filter(q => q.gte(q.field("timestamp"), monthStart.getTime()))
      .collect();
    
    const totalRequests = usage.reduce((sum, u) => sum + u.requests, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
    
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      apiKey: user.apiKey,
      subscription: user.subscription,
      limits: user.limits,
      usage: {
        requests: totalRequests,
        cost: totalCost,
        remaining: user.limits.monthlyRequests - totalRequests
      }
    };
  }
});

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'lp_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}