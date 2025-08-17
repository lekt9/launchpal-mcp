import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      
      const apiKey = generateApiKey();
      
      return ctx.db.insert("users", {
        email: args.profile.email!,
        name: args.profile.name,
        apiKey,
        subscription: "free",
        limits: {
          monthlyRequests: 100,
          platforms: 1,
          products: 3
        }
      });
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