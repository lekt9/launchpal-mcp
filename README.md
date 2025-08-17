# LaunchPal - Multi-Platform Launch Automation System

A comprehensive launch automation platform that helps you launch products across multiple platforms (Product Hunt, Hacker News, Reddit, Indie Hackers) with a monetized backend API and MCP server integration.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│  MCP Server  │────▶│  Convex Backend │
│  (Claude, etc)  │     │   (Proxy)    │     │   (Database)    │
└─────────────────┘     └──────────────┘     └─────────────────┘
                              │                      │
                              ▼                      ▼
                        ┌──────────┐          ┌──────────────┐
                        │  OAuth   │          │   Platform   │
                        │   2.1    │          │   Adapters   │
                        └──────────┘          └──────────────┘
                                                     │
                                              ┌──────┴──────┐
                                              ▼             ▼
                                        Product Hunt   Hacker News
                                              ▼             ▼
                                           Reddit    Indie Hackers
```

## Features

### 🚀 Multi-Platform Support
- **Product Hunt**: Full API integration with OAuth
- **Hacker News**: Automated submissions and tracking
- **Reddit**: Subreddit-specific launches
- **Indie Hackers**: Community engagement tools

### 💰 Monetization & Billing
- Usage-based billing with Polar
- Subscription tiers (Free, Starter, Pro)
- API key management
- Request tracking and limits

### 🔐 Authentication & Security
- OAuth 2.1 with PKCE support
- JWT-based authentication
- API key authentication
- Rate limiting per tier

### 📊 Analytics & Tracking
- Real-time launch metrics
- Engagement tracking
- Competition analysis
- Performance predictions

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/launchpal.git
cd launchpal
```

### 2. Set Up Convex Backend

```bash
cd convex
npm install
npx convex dev  # For development
```

Create `.env.local`:
```env
POLAR_ORGANIZATION_TOKEN=your_polar_token
POLAR_WEBHOOK_SECRET=your_webhook_secret
```

Deploy to production:
```bash
npx convex deploy
```

### 3. Configure Platform Credentials

#### Product Hunt
1. Go to [Product Hunt API](https://www.producthunt.com/v2/oauth/applications)
2. Create a new application
3. Set redirect URI: `https://launch.getfoundry.app/oauth/callback`
4. Note your Client ID and Client Secret

#### Other Platforms
- **Hacker News**: Username and password
- **Reddit**: Reddit App credentials
- **Indie Hackers**: API key from settings

### 4. Set Up MCP Server

```bash
cd mcp-server
npm install
npm run build
```

Create `.env`:
```env
LAUNCHPAL_API_KEY=your_api_key
CONVEX_URL=https://your-app.convex.cloud
LAUNCHPAL_API_URL=https://launch.getfoundry.app
```

### 5. Deploy to Smithery

```bash
# Install Smithery CLI
npm install -g @smithery/cli

# Login
npx @smithery/cli login

# Deploy
smithery deploy .
```

Users can then install:
```bash
npx @smithery/cli install @yourusername/launchpal --client claude
```

## Usage

### Via MCP Client (Claude, etc.)

1. **Authenticate**:
```
Use the authenticate tool with your email and password
```

2. **Connect Platform**:
```
Connect Product Hunt with your Client ID and Secret
```

3. **Create Product**:
```
Create a product on Product Hunt with name, tagline, and description
```

4. **Schedule Launch**:
```
Schedule the launch for Tuesday 12:01 AM PST
```

5. **Track Metrics**:
```
Get launch metrics to see votes, comments, and ranking
```

### Via API

```bash
# Authenticate
curl -X POST https://launch.getfoundry.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create Product
curl -X POST https://launch.getfoundry.app/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "producthunt",
    "name": "My Product",
    "tagline": "Amazing product",
    "description": "Description here",
    "website": "https://myproduct.com"
  }'
```

## Subscription Tiers

### Free Tier
- 100 requests/month
- 1 platform connection
- 3 products max
- Basic analytics

### Starter ($29/month)
- 1,000 requests/month
- 3 platform connections
- 10 products max
- Advanced analytics
- Priority support

### Pro ($99/month)
- 10,000 requests/month
- Unlimited platforms
- Unlimited products
- Real-time analytics
- API access
- Dedicated support

## API Documentation

### Authentication
- OAuth 2.1 flow at `/oauth/authorize`
- Token endpoint at `/oauth/token`
- API key authentication via Bearer token

### Endpoints
- `POST /api/products` - Create product
- `POST /api/launches` - Schedule launch
- `GET /api/launches/:id/metrics` - Get metrics
- `POST /api/platforms/:platform/connect` - Connect platform
- `GET /api/usage` - Check usage and limits

## Development

### Local Development
```bash
# Convex backend
cd convex
npm run dev

# MCP server
cd mcp-server
npm run dev
```

### Testing
```bash
npm test
```

### Building
```bash
npm run build
```

## Environment Variables

### Convex Backend
- `CONVEX_DEPLOY_KEY` - Deployment key from Convex dashboard
- `POLAR_ORGANIZATION_TOKEN` - Polar API token
- `POLAR_WEBHOOK_SECRET` - Polar webhook secret

### MCP Server
- `LAUNCHPAL_API_KEY` - Your LaunchPal API key
- `CONVEX_URL` - Convex deployment URL
- `LAUNCHPAL_API_URL` - Backend API URL

## Support

- Documentation: [launch.getfoundry.app/docs](https://launch.getfoundry.app/docs)
- Issues: [GitHub Issues](https://github.com/yourusername/launchpal/issues)
- Email: support@getfoundry.app

## License

MIT