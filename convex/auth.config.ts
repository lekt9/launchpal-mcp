import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Simple auth for demo - in production use proper auth provider
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();
    
    if (!user || user.password !== args.password) {
      throw new Error("Invalid credentials");
    }
    
    return { userId: user._id, token: user.apiKey };
  }
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();
    
    if (existing) {
      throw new Error("User already exists");
    }
    
    const apiKey = generateApiKey();
    
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: args.password,
      name: args.name,
      apiKey,
      subscription: "free",
      limits: {
        monthlyRequests: 100,
        platforms: 1,
        products: 3
      }
    });
    
    return { userId, apiKey };
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