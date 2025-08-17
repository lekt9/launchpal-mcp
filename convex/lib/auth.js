export async function getCurrentUser(_ctx) {
    // In a real app, this would check the auth token
    // For now, return null (auth handled differently)
    return null;
}
export async function getUserByApiKey(ctx, apiKey) {
    const key = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", q => q.eq("key", apiKey))
        .first();
    if (!key)
        return null;
    // Update last used
    if ('patch' in ctx.db) {
        await ctx.db.patch(key._id, { lastUsed: Date.now() });
    }
    return await ctx.db.get(key.userId);
}
export async function verifyApiKey(ctx, apiKey) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_api_key", q => q.eq("apiKey", apiKey))
        .first();
    return user;
}
export async function getUserById(ctx, userId) {
    return await ctx.db.get(userId);
}
//# sourceMappingURL=auth.js.map