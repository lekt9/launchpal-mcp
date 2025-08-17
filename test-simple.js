import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://gallant-finch-723.convex.cloud");

async function testSimple() {
  console.log("🚀 Testing LaunchPal Connection...\n");

  try {
    // Test basic query - list platforms
    console.log("1. Testing platforms query...");
    const platforms = await client.query("platforms:list");
    console.log("✅ Available platforms:", platforms);

    console.log("\n✨ Connection successful! LaunchPal is working.");
    console.log("\n📝 Next steps to fully test:");
    console.log("1. Set up authentication with Convex Auth");
    console.log("2. Connect platform credentials (Product Hunt, etc.)");
    console.log("3. Create and schedule launches");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Make sure Convex dev server is running with: npx convex dev");
  }
}

testSimple();