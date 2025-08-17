import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  // In a real app, this would check the auth token
  // For now, return null (auth handled differently)
  return null;
}

export async function getUserByApiKey(ctx: QueryCtx | MutationCtx, apiKey: string) {
  const key = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", q => q.eq("key", apiKey))
    .first();
  
  if (!key) return null;
  
  // Update last used
  if ('patch' in ctx.db) {
    await (ctx as MutationCtx).db.patch(key._id, { lastUsed: Date.now() });
  }
  
  return await ctx.db.get(key.userId);
}

export async function verifyApiKey(ctx: QueryCtx | MutationCtx, apiKey: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_api_key", q => q.eq("apiKey", apiKey))
    .first();
  
  return user;
}

export async function getUserById(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db.get(userId);
}