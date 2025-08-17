import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { trackUsage } from "./lib/usage";

export const connect = mutation({
  args: {
    userId: v.id("users"),
    platform: v.string(),
    credentials: v.any()
  },
  handler: async (ctx, args) => {
    await trackUsage(ctx, args.userId, "platforms.connect", 0.01);
    
    const existing = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user_platform", q => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        credentials: args.credentials,
        isActive: true
      });
    } else {
      await ctx.db.insert("platformCredentials", {
        userId: args.userId,
        platform: args.platform,
        credentials: args.credentials,
        isActive: true
      });
    }
    
    return { 
      success: true, 
      message: `Successfully connected to ${args.platform}` 
    };
  }
});

export const disconnect = mutation({
  args: {
    userId: v.id("users"),
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user_platform", q => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();
    
    if (credential) {
      await ctx.db.patch(credential._id, { isActive: false });
    }
    
    return { success: true };
  }
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", identity.email!))
      .first();
    
    if (!user) return [];
    
    const credentials = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    
    const platforms = [
      {
        id: "producthunt",
        name: "Product Hunt",
        description: "Launch tech products to a community of early adopters",
        requiredCredentials: ["clientId", "clientSecret"]
      },
      {
        id: "hackernews",
        name: "Hacker News",
        description: "Share with the tech-savvy community",
        requiredCredentials: ["username", "password"]
      },
      {
        id: "reddit",
        name: "Reddit",
        description: "Launch on relevant subreddits",
        requiredCredentials: ["clientId", "clientSecret", "username", "password"]
      },
      {
        id: "indiehackers",
        name: "Indie Hackers",
        description: "Share with the indie maker community",
        requiredCredentials: ["apiKey"]
      }
    ];
    
    return platforms.map(platform => ({
      ...platform,
      connected: credentials.some(c => c.platform === platform.id && c.isActive)
    }));
  }
});

export const getCredentials = query({
  args: {
    userId: v.id("users"),
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("platformCredentials")
      .withIndex("by_user_platform", q => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();
    
    return credential;
  }
});