import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthToken } from './authServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TokenManager {
  private tokenPath: string;
  private token: AuthToken | null = null;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath || path.join(__dirname, '../../.auth/tokens.json');
  }

  async initialize(): Promise<void> {
    await this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      this.token = JSON.parse(data);
    } catch (error) {
      // No token file exists yet
      this.token = null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    await this.loadToken(); // Reload to get latest token
    
    if (!this.token) {
      return null;
    }

    // Check if token is expired
    if (this.token.expires_at && this.token.expires_at < Date.now()) {
      // Token is expired
      return null;
    }

    return this.token.access_token;
  }

  async hasValidToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  async getTokenInfo(): Promise<{
    authenticated: boolean;
    expiresAt?: number;
    createdAt?: number;
    scopes?: string;
  }> {
    await this.loadToken();

    if (!this.token) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      expiresAt: this.token.expires_at,
      createdAt: this.token.created_at,
      scopes: this.token.scope,
    };
  }

  async clearToken(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
      this.token = null;
    } catch {
      // File doesn't exist, that's ok
    }
  }

  async waitForToken(timeout: number = 60000): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const token = await this.getAccessToken();
      if (token) {
        return token;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  }
}