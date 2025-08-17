#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { ConvexHttpClient } from 'convex/browser';
import axios from 'axios';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  apiKey: z.string().optional(),
  convexUrl: z.string().default('https://launch.convex.cloud'),
  apiUrl: z.string().default('https://launch.getfoundry.app'),
  debugMode: z.boolean().default(false)
});

type Config = z.infer<typeof configSchema>;

class LaunchPalMCPServer {
  private server: Server;
  private convexClient: ConvexHttpClient;
  private config: Config;
  private authToken?: string;
  private apiClient: any;

  constructor() {
    this.config = configSchema.parse({
      apiKey: process.env.LAUNCHPAL_API_KEY,
      convexUrl: process.env.CONVEX_URL || 'https://launch.convex.cloud',
      apiUrl: process.env.LAUNCHPAL_API_URL || 'https://launch.getfoundry.app',
      debugMode: process.env.DEBUG === 'true'
    });

    this.server = new Server(
      {
        name: 'launchpal-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {}
        },
      }
    );

    this.convexClient = new ConvexHttpClient(this.config.convexUrl);
    
    if (this.config.apiKey) {
      this.convexClient.setAuth(this.config.apiKey);
    }

    // Initialize axios client for API calls
    this.apiClient = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupErrorHandling();
    this.setupHandlers();
  }

  private setupErrorHandling() {
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Authentication failed. Please check your API key.'
          );
        }
        if (error.response?.status === 429) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Rate limit exceeded. Please upgrade your plan or wait.'
          );
        }
        throw error;
      }
    );
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'authenticate',
          description: 'Authenticate with LaunchPal API using email and password',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Your LaunchPal account email' },
              password: { type: 'string', description: 'Your LaunchPal account password' }
            },
            required: ['email', 'password']
          }
        },
        {
          name: 'connect_platform',
          description: 'Connect a launch platform (Product Hunt, Hacker News, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              platform: { 
                type: 'string', 
                enum: ['producthunt', 'hackernews', 'reddit', 'indiehackers'],
                description: 'Platform to connect' 
              },
              credentials: { 
                type: 'object', 
                description: 'Platform-specific credentials'
              }
            },
            required: ['platform', 'credentials']
          }
        },
        {
          name: 'list_platforms',
          description: 'List available launch platforms and their connection status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'create_product',
          description: 'Create a product on a connected platform',
          inputSchema: {
            type: 'object',
            properties: {
              platform: { 
                type: 'string',
                description: 'Target platform for the product'
              },
              name: { type: 'string', description: 'Product name' },
              tagline: { type: 'string', description: 'Product tagline' },
              description: { type: 'string', description: 'Product description' },
              website: { type: 'string', description: 'Product website URL' },
              media: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Array of media URLs'
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Product topics/categories'
              }
            },
            required: ['platform', 'name', 'tagline', 'description', 'website']
          }
        },
        {
          name: 'schedule_launch',
          description: 'Schedule a product launch',
          inputSchema: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Product ID to launch' },
              scheduledAt: { type: 'string', description: 'ISO 8601 date string for launch time' },
              options: { 
                type: 'object',
                description: 'Platform-specific launch options'
              }
            },
            required: ['productId', 'scheduledAt']
          }
        },
        {
          name: 'get_launch_metrics',
          description: 'Get metrics for a launch',
          inputSchema: {
            type: 'object',
            properties: {
              launchId: { type: 'string', description: 'Launch ID' }
            },
            required: ['launchId']
          }
        },
        {
          name: 'get_trending',
          description: 'Get trending products from a platform',
          inputSchema: {
            type: 'object',
            properties: {
              platform: { type: 'string', description: 'Platform to get trending from' },
              period: { 
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Time period for trending'
              }
            },
            required: ['platform']
          }
        },
        {
          name: 'check_usage',
          description: 'Check your API usage and limits',
          inputSchema: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Start date for usage period' },
              endDate: { type: 'string', description: 'End date for usage period' }
            }
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate': {
            const response = await axios.post(`${this.config.apiUrl}/auth/login`, args);
            this.apiClient.defaults.headers['Authorization'] = `Bearer ${response.data.token}`;
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully authenticated. API Key: ${response.data.user.apiKey}\nSubscription: ${response.data.user.subscription || 'free'}`
                }
              ]
            };
          }

          case 'connect_platform': {
            const response = await this.apiClient.post(
              `/api/platforms/${args.platform}/connect`,
              args.credentials
            );
            return {
              content: [
                {
                  type: 'text',
                  text: response.data.message
                }
              ]
            };
          }

          case 'list_platforms': {
            const response = await this.apiClient.get('/api/platforms');
            const platforms = response.data.map((p: any) => 
              `${p.name} (${p.id}): ${p.connected ? '✓ Connected' : '✗ Not connected'}`
            ).join('\n');
            return {
              content: [
                {
                  type: 'text',
                  text: `Available platforms:\n${platforms}`
                }
              ]
            };
          }

          case 'create_product': {
            const response = await this.apiClient.post('/api/products', args);
            return {
              content: [
                {
                  type: 'text',
                  text: `Product created successfully!\nID: ${response.data.id}\nURL: ${response.data.url}`
                }
              ]
            };
          }

          case 'schedule_launch': {
            const response = await this.apiClient.post('/api/launches', args);
            return {
              content: [
                {
                  type: 'text',
                  text: `Launch scheduled!\nID: ${response.data.id}\nScheduled for: ${response.data.scheduledAt}`
                }
              ]
            };
          }

          case 'get_launch_metrics': {
            const response = await this.apiClient.get(`/api/launches/${args.launchId}/metrics`);
            const metrics = response.data;
            return {
              content: [
                {
                  type: 'text',
                  text: `Launch Metrics:\nVotes: ${metrics.votes}\nComments: ${metrics.comments}\nRank: ${metrics.rank}\nEngagement: ${metrics.engagement}`
                }
              ]
            };
          }

          case 'get_trending': {
            const response = await this.apiClient.get('/api/trending', {
              params: {
                platform: args.platform,
                period: args.period || 'day'
              }
            });
            const products = response.data.slice(0, 10).map((p: any, i: number) => 
              `${i + 1}. ${p.name} - ${p.tagline}`
            ).join('\n');
            return {
              content: [
                {
                  type: 'text',
                  text: `Trending on ${args.platform}:\n${products}`
                }
              ]
            };
          }

          case 'check_usage': {
            const response = await this.apiClient.get('/api/usage', {
              params: args
            });
            const usage = response.data;
            return {
              content: [
                {
                  type: 'text',
                  text: `API Usage:\nRequests: ${usage.totalRequests}/${usage.limits.monthlyRequests}\nCost: $${usage.totalCost}\nSubscription: ${usage.subscription}`
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        
        const message = error.response?.data?.error || error.message || 'Operation failed';
        throw new McpError(ErrorCode.InternalError, message);
      }
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'launch_strategy',
          description: 'Get a comprehensive launch strategy for your product',
          arguments: [
            {
              name: 'product_type',
              description: 'Type of product (SaaS, mobile app, hardware, etc.)',
              required: true
            },
            {
              name: 'target_audience',
              description: 'Primary target audience',
              required: true
            }
          ]
        }
      ]
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'launch_strategy') {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Create a comprehensive launch strategy for a ${args?.product_type} targeting ${args?.target_audience}. Include platform selection, timing, messaging, and engagement tactics.`
              }
            }
          ]
        };
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    if (this.config.debugMode) {
      console.error('LaunchPal MCP Server started in debug mode');
    }
  }
}

const server = new LaunchPalMCPServer();
server.run().catch(console.error);