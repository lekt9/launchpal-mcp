# LaunchPal MCP Server

A comprehensive MCP (Model Context Protocol) server for automating Product Hunt launches with advanced image processing, analytics, and launch management capabilities.

## Features

### 🚀 Launch Management
- Create and schedule Product Hunt launches
- Automated launch execution at optimal times
- Hunter notification and coordination
- Real-time launch monitoring

### 🖼️ Image Processing
- Batch image processing from folders
- Automatic optimization for Product Hunt specifications
- Multiple format support (gallery, thumbnail, banner)
- Image collage creation
- Watermark support

### 📊 Analytics & Tracking
- Real-time vote and comment tracking
- Performance predictions
- Competitor analysis
- Optimal launch time recommendations
- Historical performance comparison

### 🤖 Automation Tools
- Auto-reply to comments
- Voter thanking system
- Social media announcement generation
- Launch checklist generation

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your Product Hunt API credentials:
   - Get credentials from [Product Hunt API](https://www.producthunt.com/v2/oauth/applications)
   - Add `PRODUCTHUNT_CLIENT_ID` and `PRODUCTHUNT_CLIENT_SECRET` to your `.env` file
   - Set your redirect URI in Product Hunt to `http://localhost:8080/callback`

## Usage

### Starting the Server

```bash
npm run dev  # Development mode
npm run build && npm start  # Production mode
```

### Connecting with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "launchpal": {
      "command": "node",
      "args": ["/path/to/launchpal/dist/index.js"],
      "env": {
        "PRODUCTHUNT_CLIENT_ID": "your_client_id",
        "PRODUCTHUNT_CLIENT_SECRET": "your_client_secret",
        "AUTH_PORT": "8080"
      }
    }
  }
}
```

### Authentication Flow

1. **First Time Setup**: Use the `login_producthunt` tool to authenticate
2. **Browser Opens**: A browser window will open for Product Hunt OAuth login
3. **Automatic Token Management**: Tokens are stored securely and managed automatically
4. **Check Status**: Use `check_auth_status` to verify authentication
5. **Logout**: Use `logout_producthunt` to clear stored tokens

## Available Tools

### Authentication Tools

#### login_producthunt
Open browser to authenticate with Product Hunt via OAuth.

```typescript
// No parameters needed
{}
```

#### check_auth_status
Check current authentication status.

```typescript
// No parameters needed
{}
```

#### logout_producthunt
Logout and clear stored authentication tokens.

```typescript
// No parameters needed
{}
```

### Product Management Tools

#### create_product
Create a new product on Product Hunt with media support (requires authentication).

```typescript
{
  name: "My Product",
  tagline: "Amazing product tagline",
  description: "Detailed description",
  website: "https://myproduct.com",
  topics: ["productivity", "saas"],
  media: ["/path/to/image1.jpg", "/path/to/image2.png"]
}
```

### schedule_launch
Schedule a product launch with hunter coordination.

```typescript
{
  productId: "product_123",
  launchDate: "2024-01-15T00:01:00Z",
  hunters: ["hunter1", "hunter2"],
  notifySubscribers: true
}
```

### process_images
Process and optimize images from a folder.

```typescript
{
  folderPath: "/path/to/images",
  outputFormat: "gallery",
  maxWidth: 1270,
  maxHeight: 760
}
```

### track_launch
Start real-time tracking of launch performance.

```typescript
{
  productId: "product_123",
  interval: 30  // minutes
}
```

### generate_launch_report
Generate comprehensive launch analytics report.

```typescript
{
  productId: "product_123",
  includeCompetitors: true
}
```

### get_trending
Get trending products on Product Hunt.

```typescript
{
  period: "day",  // day, week, month
  limit: 10
}
```

### find_hunters
Find top hunters for your product category.

```typescript
{
  category: "productivity",
  minFollowers: 1000
}
```

### optimize_launch_time
Get optimal launch timing recommendations.

```typescript
{
  category: "saas",
  targetAudience: "US"  // US, EU, ASIA, GLOBAL
}
```

## Available Prompts

- `launch_checklist` - Complete Product Hunt launch checklist
- `product_description` - Generate compelling product descriptions
- `hunter_outreach` - Templates for reaching out to hunters
- `launch_announcement` - Social media announcement templates

## Image Processing Features

### Supported Formats
- JPG/JPEG
- PNG
- GIF
- WebP

### Automatic Optimizations
- Product Hunt gallery: 1270x760px
- Thumbnails: 300x300px
- Banners: 1920x600px
- Quality optimization
- File size reduction

### Batch Processing
Process entire folders of images with automatic format detection and optimization.

## Analytics Features

### Real-time Metrics
- Vote velocity tracking
- Engagement ratios
- Rank monitoring
- Conversion tracking

### Predictive Analytics
- Performance predictions
- Optimal timing recommendations
- Competitor comparison

### Reporting
- Comprehensive launch reports
- Timeline visualizations
- Export to JSON/CSV

## Authentication & Security

### OAuth 2.0 Flow
The server uses Product Hunt's OAuth 2.0 flow for secure authentication:

1. **No Manual Token Management**: Users don't need to manually handle access tokens
2. **Secure Token Storage**: Tokens are stored locally in `.auth/tokens.json`
3. **Automatic Token Refresh**: Tokens are refreshed automatically when needed
4. **Browser-Based Login**: Standard OAuth flow through Product Hunt's login page

### Security Features
- Tokens are never exposed in logs or console output
- State parameter validation prevents CSRF attacks
- Tokens are stored with proper file permissions
- Automatic cleanup on logout

## Best Practices

1. **Authentication First**: Always authenticate before using product management features
2. **Launch Timing**: Tuesday 12:01 AM PST is typically optimal
3. **Images**: Use high-quality images at 1270x760px for gallery
4. **Hunters**: Reach out to hunters 1-2 weeks before launch
5. **Engagement**: Reply to comments within first 2 hours
6. **Promotion**: Coordinate social media posts for launch day

## Development

```bash
npm run dev  # Start development server
npm run build  # Build for production
npm test  # Run tests
```

## License

MIT