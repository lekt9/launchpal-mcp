import { QueryCtx, MutationCtx } from "../_generated/server";
import { auth } from "../auth.config";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await auth.getUserIdentity(ctx);
  if (!identity) return null;
  
  return await ctx.db
    .query("users")
    .withIndex("by_email", q => q.eq("email", identity.email!))
    .first();
}

export async function getUserByApiKey(ctx: QueryCtx | MutationCtx, apiKey: string) {
  const key = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", q => q.eq("key", apiKey))
    .first();
  
  if (!key) return null;
  
  // Update last used
  if ('db' in ctx) {
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