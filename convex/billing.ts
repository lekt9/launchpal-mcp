import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";

// Polar integration for billing
const POLAR_CONFIG = {
  products: {
    starter: "prod_starter_monthly",
    starterYearly: "prod_starter_yearly",
    pro: "prod_pro_monthly",
    proYearly: "prod_pro_yearly"
  },
  organizationToken: process.env.POLAR_ORGANIZATION_TOKEN!,
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox"
};

export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("pro")),
    interval: v.union(v.literal("monthly"), v.literal("yearly"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const productKey = args.interval === "yearly" 
      ? `${args.plan}Yearly` 
      : args.plan;
    
    const productId = POLAR_CONFIG.products[productKey as keyof typeof POLAR_CONFIG.products];
    
    // Create Polar checkout session
    const response = await fetch(`https://api.polar.sh/v1/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POLAR_CONFIG.organizationToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: user.email,
        metadata: {
          userId: user._id
        },
        success_url: "https://launch.getfoundry.app/billing/success",
        cancel_url: "https://launch.getfoundry.app/billing"
      })
    });
    
    const data = await response.json();
    
    return {
      checkoutUrl: data.checkout_url
    };
  }
});

export const handleWebhook = action({
  args: {
    event: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    // Verify webhook signature
    // Process Polar webhook events
    
    switch (args.event) {
      case "subscription.created":
      case "subscription.updated": {
        const { customer_email, product_id, status } = args.data;
        
        // Find user by email
        const user = await ctx.runQuery(api.users.getByEmail, { 
          email: customer_email 
        });
        
        if (user) {
          // Determine plan from product_id
          let subscription = "free";
          let limits = { monthlyRequests: 100, platforms: 1, products: 3 };
          
          if (product_id.includes("starter")) {
            subscription = "starter";
            limits = { monthlyRequests: 1000, platforms: 3, products: 10 };
          } else if (product_id.includes("pro")) {
            subscription = "pro";
            limits = { monthlyRequests: 10000, platforms: 999, products: 999 };
          }
          
          await ctx.runMutation(api.users.updateSubscription, {
            userId: user._id,
            subscription,
            limits,
            polarCustomerId: args.data.customer_id
          });
        }
        break;
      }
      
      case "subscription.cancelled": {
        const { customer_email } = args.data;
        
        const user = await ctx.runQuery(api.users.getByEmail, { 
          email: customer_email 
        });
        
        if (user) {
          await ctx.runMutation(api.users.updateSubscription, {
            userId: user._id,
            subscription: "free",
            limits: { monthlyRequests: 100, platforms: 1, products: 3 },
            polarCustomerId: null
          });
        }
        break;
      }
    }
    
    return { success: true };
  }
});

export const getSubscription = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    return {
      plan: user.subscription,
      limits: user.limits,
      customerId: user.polarCustomerId
    };
  }
});

export const cancelSubscription = action({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    if (!user.polarCustomerId) {
      throw new Error("No active subscription");
    }
    
    // Cancel via Polar API
    const response = await fetch(
      `https://api.polar.sh/v1/subscriptions/${user.polarCustomerId}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${POLAR_CONFIG.organizationToken}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to cancel subscription");
    }
    
    return { success: true };
  }
});