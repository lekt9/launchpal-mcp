import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

const ENDPOINT_COSTS: Record<string, number> = {
  "products.create": 0.10,
  "launches.schedule": 0.05,
  "launches.getMetrics": 0.02,
  "platforms.connect": 0.01,
  "default": 0.01
};

export async function trackUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  endpoint: string,
  cost?: number
) {
  const actualCost = cost ?? ENDPOINT_COSTS[endpoint] ?? ENDPOINT_COSTS.default;
  
  await ctx.db.insert("usage", {
    userId,
    endpoint,
    method: "CALL",
    requests: 1,
    cost: actualCost,
    timestamp: Date.now(),
    metadata: {}
  });
  
  // Check monthly usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthlyUsage = await ctx.db
    .query("usage")
    .withIndex("by_user", q => q.eq("userId", userId))
    .filter(q => q.gte(q.field("timestamp"), monthStart.getTime()))
    .collect();
  
  const totalRequests = monthlyUsage.reduce((sum, u) => sum + u.requests, 0);
  
  const user = await ctx.db.get(userId);
  if (user && totalRequests > user.limits.monthlyRequests) {
    throw new Error(`Monthly request limit exceeded (${user.limits.monthlyRequests})`);
  }
}

export async function getUsageStats(ctx: MutationCtx, userId: Id<"users">) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const usage = await ctx.db
    .query("usage")
    .withIndex("by_user", q => q.eq("userId", userId))
    .filter(q => q.gte(q.field("timestamp"), monthStart.getTime()))
    .collect();
  
  const totalRequests = usage.reduce((sum, u) => sum + u.requests, 0);
  const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
  
  return {
    totalRequests,
    totalCost,
    entries: usage.length
  };
}