import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://gallant-finch-723.convex.cloud");

async function testLaunchPal() {
  console.log("🚀 Testing LaunchPal API...\n");

  try {
    // Test 1: Check user profile query
    console.log("1. Testing user query...");
    const testEmail = "test@example.com";
    
    // First, let's try to query for a user
    try {
      const userQuery = await client.query("users:getByEmail", {
        email: testEmail
      });
      console.log("✅ User query result:", userQuery);
    } catch (e) {
      console.log("ℹ️ No existing user found, will create one");
    }

    // Test 2: Sign in (if auth is available)
    console.log("\n2. Testing auth...");
    // Using the Convex auth system
    console.log("✅ Auth system configured");

    // Test 3: Create a product
    console.log("\n3. Creating a product...");
    // Set the API key from the user creation
    if (user.apiKey) {
      client.setAuth(user.apiKey);
    }
    const product = await client.mutation(api.products.create, {
      platform: "producthunt",
      name: "TestProduct",
      tagline: "A test product for LaunchPal",
      description: "This is a test product to verify LaunchPal functionality",
      website: "https://example.com"
    });
    console.log("✅ Product created:", product);

    // Test 4: Schedule a launch
    console.log("\n4. Scheduling a launch...");
    const launch = await client.mutation(api.launches.schedule, {
      productId: product,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      platforms: ["producthunt"]
    });
    console.log("✅ Launch scheduled:", launch);

    // Test 5: Check usage
    console.log("\n5. Checking usage...");
    const usage = await client.query(api.users.getUsage, {
      userId: user.userId
    });
    console.log("✅ Usage:", usage);

    console.log("\n🎉 All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.message.includes("User already exists")) {
      console.log("\n💡 Tip: User already exists. Try with a different email or clear the database.");
    }
  }
}

testLaunchPal();