import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getUserById } from "./lib/auth";

export const createCheckoutSession = action({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("pro")),
    interval: v.union(v.literal("monthly"), v.literal("yearly"))
  },
  handler: async (ctx, args) => {
    // In production, integrate with Stripe/Polar
    // For now, return a mock checkout URL
    return {
      checkoutUrl: `https://checkout.stripe.com/mock?plan=${args.plan}&interval=${args.interval}`
    };
  }
});

export const handleWebhook = action({
  args: {
    event: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    // Process webhook events from payment provider
    switch (args.event) {
      case "subscription.created":
      case "subscription.updated": {
        const { customer_email, product_id, status } = args.data;
        
        // Update user subscription in database
        await ctx.runMutation(api.users.updateSubscription, {
          email: customer_email,
          subscription: product_id.includes("starter") ? "starter" : "pro",
          limits: product_id.includes("starter") 
            ? { monthlyRequests: 1000, platforms: 3, products: 10 }
            : { monthlyRequests: 10000, platforms: 999, products: 999 }
        });
        break;
      }
      
      case "subscription.cancelled": {
        const { customer_email } = args.data;
        
        await ctx.runMutation(api.users.updateSubscription, {
          email: customer_email,
          subscription: "free",
          limits: { monthlyRequests: 100, platforms: 1, products: 3 }
        });
        break;
      }
    }
    
    return { success: true };
  }
});

export const getSubscription = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const user = await getUserById(ctx, args.userId);
    if (!user) throw new Error("User not found");
    
    return {
      plan: user.subscription,
      limits: user.limits,
      customerId: user.polarCustomerId
    };
  }
});

export const cancelSubscription = action({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // In production, cancel via payment provider API
    // For now, just update the user's subscription
    await ctx.runMutation(api.users.updateSubscription, {
      userId: args.userId,
      subscription: "free",
      limits: { monthlyRequests: 100, platforms: 1, products: 3 }
    });
    
    return { success: true };
  }
});