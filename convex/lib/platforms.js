import { ProductHuntAdapter } from "./adapters/ProductHuntAdapter";
export async function getPlatformAdapter(platform, credentials) {
    switch (platform) {
        case "producthunt":
            return new ProductHuntAdapter(credentials);
        case "hackernews":
            // return new HackerNewsAdapter(credentials);
            throw new Error("Hacker News adapter coming soon");
        case "reddit":
            // return new RedditAdapter(credentials);
            throw new Error("Reddit adapter coming soon");
        case "indiehackers":
            // return new IndieHackersAdapter(credentials);
            throw new Error("Indie Hackers adapter coming soon");
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}
export const SUPPORTED_PLATFORMS = [
    {
        id: "producthunt",
        name: "Product Hunt",
        description: "Launch tech products to early adopters",
        launchTips: [
            "Launch on Tuesday at 12:01 AM PST",
            "Prepare high-quality gallery images (1270x760px)",
            "Engage with comments in first 2 hours"
        ]
    },
    {
        id: "hackernews",
        name: "Hacker News",
        description: "Share with the tech community",
        launchTips: [
            "Post between 7-9 AM PST on weekdays",
            "Use Show HN format for new products",
            "Focus on technical innovation"
        ]
    },
    {
        id: "reddit",
        name: "Reddit",
        description: "Launch on relevant subreddits",
        launchTips: [
            "Read subreddit rules first",
            "Engage authentically with community",
            "Avoid overly promotional language"
        ]
    },
    {
        id: "indiehackers",
        name: "Indie Hackers",
        description: "Connect with indie makers",
        launchTips: [
            "Share your building journey",
            "Be transparent about metrics",
            "Help others in the community"
        ]
    }
];
//# sourceMappingURL=platforms.js.map