import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  created_at: number;
  expires_at?: number;
  refresh_token?: string;
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  port: number;
  tokenStorePath: string;
}

export class AuthServer {
  private app: express.Application;
  private server: any;
  private authState: string;
  private tokenStorePath: string;

  constructor(private config: AuthConfig) {
    this.app = express();
    this.authState = crypto.randomBytes(32).toString('hex');
    this.tokenStorePath = config.tokenStorePath || path.join(__dirname, '../../.auth/tokens.json');
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Login page
    this.app.get('/', async (req, res) => {
      const isAuthenticated = await this.hasValidToken();
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LaunchPal - Product Hunt Authentication</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #666;
              margin-bottom: 30px;
            }
            .status {
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .status.authenticated {
              background: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .status.not-authenticated {
              background: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #da552f;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              transition: all 0.2s;
              border: none;
              cursor: pointer;
              font-size: 16px;
            }
            .button:hover {
              background: #c44325;
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(218, 85, 47, 0.3);
            }
            .button.secondary {
              background: #6c757d;
              margin-left: 10px;
            }
            .button.secondary:hover {
              background: #5a6268;
            }
            .info {
              margin-top: 30px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 6px;
              color: #666;
              font-size: 14px;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="logo" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="#da552f"/>
              <text x="50" y="65" font-size="40" text-anchor="middle" fill="white" font-weight="bold">P</text>
            </svg>
            <h1>🚀 LaunchPal Authentication</h1>
            <p class="subtitle">Connect your Product Hunt account to get started</p>
            
            ${isAuthenticated 
              ? `
                <div class="status authenticated">
                  ✅ You are authenticated with Product Hunt
                </div>
                <button class="button secondary" onclick="location.href='/logout'">Logout</button>
                <button class="button" onclick="location.href='/status'">View Status</button>
              `
              : `
                <div class="status not-authenticated">
                  ⚠️ Not authenticated. Please login to continue.
                </div>
                <a href="/auth" class="button">Login with Product Hunt</a>
              `
            }
            
            <div class="info">
              <strong>Why authenticate?</strong><br>
              Authentication allows LaunchPal to:
              <ul>
                <li>Create and manage your products</li>
                <li>Schedule and automate launches</li>
                <li>Track performance metrics</li>
                <li>Interact with the Product Hunt community</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `);
    });

    // Start OAuth flow
    this.app.get('/auth', (req, res) => {
      const authUrl = `https://www.producthunt.com/v2/oauth/authorize?` +
        `client_id=${this.config.clientId}&` +
        `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
        `response_type=code&` +
        `scope=public+private+write&` +
        `state=${this.authState}`;
      
      res.redirect(authUrl);
    });

    // OAuth callback
    this.app.get('/callback', async (req, res) => {
      const { code, state } = req.query;

      if (state !== this.authState) {
        return res.status(400).send('Invalid state parameter');
      }

      if (!code) {
        return res.status(400).send('No authorization code received');
      }

      try {
        // Exchange code for token
        const tokenResponse = await axios.post('https://api.producthunt.com/v2/oauth/token', {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
          code: code as string,
        });

        const token: AuthToken = {
          ...tokenResponse.data,
          created_at: Date.now(),
          expires_at: tokenResponse.data.expires_in 
            ? Date.now() + (tokenResponse.data.expires_in * 1000)
            : undefined,
        };

        // Save token
        await this.saveToken(token);

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .success-container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .checkmark {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                background: #4CAF50;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: scale 0.5s ease;
              }
              @keyframes scale {
                0% { transform: scale(0); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
              }
              .checkmark svg {
                width: 40px;
                height: 40px;
                fill: white;
              }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin-bottom: 20px; }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background: #da552f;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
              }
              .info {
                margin-top: 20px;
                padding: 15px;
                background: #f0f9ff;
                border-radius: 6px;
                font-size: 14px;
                color: #0369a1;
              }
            </style>
          </head>
          <body>
            <div class="success-container">
              <div class="checkmark">
                <svg viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <h1>Authentication Successful!</h1>
              <p>You're now connected to Product Hunt</p>
              <div class="info">
                You can now close this window and return to LaunchPal MCP in Claude.
              </div>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </div>
          </body>
          </html>
        `);

      } catch (error) {
        console.error('Token exchange failed:', error);
        res.status(500).send('Authentication failed. Please try again.');
      }
    });

    // Logout
    this.app.get('/logout', async (req, res) => {
      await this.clearToken();
      res.redirect('/');
    });

    // Status endpoint
    this.app.get('/status', async (req, res) => {
      const token = await this.getToken();
      const isValid = await this.hasValidToken();
      
      res.json({
        authenticated: isValid,
        hasToken: !!token,
        tokenCreatedAt: token?.created_at ? new Date(token.created_at).toISOString() : null,
        tokenExpiresAt: token?.expires_at ? new Date(token.expires_at).toISOString() : null,
        scopes: token?.scope,
      });
    });

    // API endpoint for MCP server to check auth
    this.app.get('/api/token', async (req, res) => {
      const token = await this.getToken();
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Don't send the actual token, just confirmation
      res.json({ 
        authenticated: true,
        expiresAt: token.expires_at,
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🔐 Auth server running at http://localhost:${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }

  async openLoginPage(): Promise<void> {
    await open(`http://localhost:${this.config.port}`);
  }

  private async saveToken(token: AuthToken): Promise<void> {
    const dir = path.dirname(this.tokenStorePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.tokenStorePath, JSON.stringify(token, null, 2));
  }

  async getToken(): Promise<AuthToken | null> {
    try {
      const data = await fs.readFile(this.tokenStorePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async clearToken(): Promise<void> {
    try {
      await fs.unlink(this.tokenStorePath);
    } catch {
      // File doesn't exist, that's ok
    }
  }

  async hasValidToken(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    
    // Check if token is expired
    if (token.expires_at && token.expires_at < Date.now()) {
      return false;
    }
    
    return true;
  }

  async getAccessToken(): Promise<string | null> {
    const token = await this.getToken();
    if (!token) return null;
    
    // If token is expired, try to refresh it
    if (token.expires_at && token.expires_at < Date.now()) {
      if (token.refresh_token) {
        try {
          const refreshed = await this.refreshToken(token.refresh_token);
          await this.saveToken(refreshed);
          return refreshed.access_token;
        } catch {
          return null;
        }
      }
      return null;
    }
    
    return token.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<AuthToken> {
    const response = await axios.post('https://api.producthunt.com/v2/oauth/token', {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return {
      ...response.data,
      created_at: Date.now(),
      expires_at: response.data.expires_in 
        ? Date.now() + (response.data.expires_in * 1000)
        : undefined,
    };
  }
}