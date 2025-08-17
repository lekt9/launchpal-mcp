# Deployment Guide for launch.getfoundry.app

## Setting up Custom Domain in Convex

1. **Deploy to Convex Production**:
```bash
npx convex deploy --prod
```

2. **Configure Custom Domain**:
- Go to your Convex Dashboard
- Navigate to Settings → Hosting
- Add custom domain: `launch.getfoundry.app`
- Convex will provide DNS records

3. **DNS Configuration** (in your DNS provider):
```
Type: CNAME
Name: launch
Value: [your-deployment].convex.site
```

## OAuth Configuration

The HTTP endpoints in Convex will be available at:
- Authorization: `https://launch.getfoundry.app/oauth/authorize`
- Token: `https://launch.getfoundry.app/oauth/token`
- Callback: `https://launch.getfoundry.app/oauth/callback`

## Product Hunt Setup

1. Go to [Product Hunt OAuth Apps](https://www.producthunt.com/v2/oauth/applications)
2. Create new application with:
   - Redirect URI: `https://launch.getfoundry.app/oauth/callback`
   - Scopes: `public private write`

## Environment Variables

Set these in Convex Dashboard → Settings → Environment Variables:
```
POLAR_ORGANIZATION_TOKEN=your_token
POLAR_WEBHOOK_SECRET=your_secret
```

## Webhook Configuration

Configure Polar webhook:
- URL: `https://launch.getfoundry.app/webhooks/polar`
- Events: All subscription events

## Testing

Test the OAuth flow:
```bash
curl https://launch.getfoundry.app/.well-known/oauth-authorization-server
```

Should return the OAuth discovery document.