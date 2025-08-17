import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import GitHub from "@auth/core/providers/github";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    GitHub
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if user exists
      if (args.existingUserId) {
        // Update existing user
        await ctx.db.patch(args.existingUserId, {
          email: args.profile.email,
          name: args.profile.name,
        });
        return args.existingUserId;
      }
      
      // Create new user with LaunchPal specific fields
      const apiKey = generateApiKey();
      
      const userId = await ctx.db.insert("users", {
        email: args.profile.email!,
        password: "", // Password is handled by Convex Auth
        name: args.profile.name,
        apiKey,
        subscription: "free",
        limits: {
          monthlyRequests: 100,
          platforms: 1,
          products: 3
        }
      });
      
      return userId;
    }
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