import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";

const app = new Hono();

app.use('/*', cors({
  origin: ['http://localhost:8080', 'https://launch.getfoundry.app'],
  credentials: true
}));

// OAuth 2.1 Authorization Endpoint
app.get('/oauth/authorize', async (c) => {
  const { client_id, redirect_uri, state, scope, code_challenge, code_challenge_method } = c.req.query();
  
  // Return HTML login/consent page
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LaunchPal Authorization</title>
      <style>
        body { font-family: system-ui; max-width: 400px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        input { width: 100%; padding: 8px; margin-top: 5px; }
        button { background: #4F46E5; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #4338CA; }
      </style>
    </head>
    <body>
      <h2>Authorize LaunchPal</h2>
      <p>The application ${client_id} is requesting access to your LaunchPal account.</p>
      <form method="POST" action="/oauth/authorize">
        <input type="hidden" name="client_id" value="${client_id}">
        <input type="hidden" name="redirect_uri" value="${redirect_uri}">
        <input type="hidden" name="state" value="${state}">
        <input type="hidden" name="scope" value="${scope}">
        <input type="hidden" name="code_challenge" value="${code_challenge}">
        <input type="hidden" name="code_challenge_method" value="${code_challenge_method}">
        
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" name="consent" required>
            Allow access to your LaunchPal account
          </label>
        </div>
        
        <button type="submit">Authorize</button>
      </form>
    </body>
    </html>
  `);
});

// OAuth 2.1 Token Endpoint
app.post('/oauth/token', async (c) => {
  const body = await c.req.parseBody();
  const { grant_type, code, client_id, client_secret, refresh_token, code_verifier } = body;
  
  // Handle authorization code flow
  if (grant_type === 'authorization_code') {
    // Verify code and return tokens
    return c.json({
      access_token: generateToken(),
      refresh_token: generateToken(),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write'
    });
  }
  
  // Handle refresh token flow
  if (grant_type === 'refresh_token') {
    return c.json({
      access_token: generateToken(),
      token_type: 'Bearer',
      expires_in: 3600
    });
  }
  
  return c.json({ error: 'unsupported_grant_type' }, 400);
});

// OAuth Discovery Endpoint
app.get('/.well-known/oauth-authorization-server', async (c) => {
  return c.json({
    issuer: 'https://launch.getfoundry.app',
    authorization_endpoint: 'https://launch.getfoundry.app/oauth/authorize',
    token_endpoint: 'https://launch.getfoundry.app/oauth/token',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: ['read', 'write']
  });
});

// API Endpoints with Bearer Token Auth
app.use('/api/*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = auth.substring(7);
  
  // Verify token and set user context
  try {
    // In production, verify JWT or lookup API key
    c.set('userId', 'user_id_from_token');
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

app.post('/api/products', async (c) => {
  const body = await c.req.json();
  // Call Convex mutation
  return c.json({ success: true });
});

app.post('/api/launches', async (c) => {
  const body = await c.req.json();
  // Call Convex mutation
  return c.json({ success: true });
});

app.get('/api/usage', async (c) => {
  // Call Convex query
  return c.json({
    totalRequests: 50,
    totalCost: 5.00,
    subscription: 'free',
    limits: {
      monthlyRequests: 100,
      platforms: 1,
      products: 3
    }
  });
});

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const http = httpRouter();

http.route({
  path: "/*",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const response = await app.fetch(request);
    return response;
  })
});

http.route({
  path: "/*",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const response = await app.fetch(request);
    return response;
  })
});

export default http;