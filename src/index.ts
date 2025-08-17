#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ProductHuntAPI } from './services/producthunt.js';
import { ImageProcessor } from './services/imageProcessor.js';
import { LaunchManager } from './services/launchManager.js';
import { AnalyticsTracker } from './services/analytics.js';
import { AuthServer } from './auth/authServer.js';
import { TokenManager } from './auth/tokenManager.js';
import { loadConfig } from './config.js';
import chalk from 'chalk';
import open from 'open';

const config = loadConfig();
const tokenManager = new TokenManager();
await tokenManager.initialize();

const productHuntAPI = new ProductHuntAPI({
  ...config.productHunt,
  tokenManager,
});
const imageProcessor = new ImageProcessor(config.images);
const launchManager = new LaunchManager(productHuntAPI, imageProcessor);
const analytics = new AnalyticsTracker();

let authServer: AuthServer | null = null;

const server = new Server(
  {
    name: 'launchpal-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Tool schemas
const CreateProductSchema = z.object({
  name: z.string().describe('Product name'),
  tagline: z.string().describe('Product tagline (60 chars max)'),
  description: z.string().describe('Product description'),
  website: z.string().url().describe('Product website URL'),
  topics: z.array(z.string()).describe('Array of topic slugs'),
  media: z.array(z.string()).optional().describe('Array of image file paths'),
});

const ScheduleLaunchSchema = z.object({
  productId: z.string().describe('Product ID from Product Hunt'),
  launchDate: z.string().describe('Launch date in ISO format'),
  hunters: z.array(z.string()).optional().describe('Array of hunter usernames'),
  notifySubscribers: z.boolean().default(true),
});

const ProcessImagesSchema = z.object({
  folderPath: z.string().describe('Path to folder containing images'),
  outputFormat: z.enum(['gallery', 'thumbnail', 'banner']).default('gallery'),
  maxWidth: z.number().optional().default(1200),
  maxHeight: z.number().optional().default(800),
});

const TrackLaunchSchema = z.object({
  productId: z.string().describe('Product ID to track'),
  interval: z.number().optional().default(30).describe('Update interval in minutes'),
});

const GenerateLaunchReportSchema = z.object({
  productId: z.string().describe('Product ID for report'),
  includeCompetitors: z.boolean().default(false),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'login_producthunt',
        description: 'Open browser to login to Product Hunt',
        inputSchema: z.object({}),
      },
      {
        name: 'logout_producthunt',
        description: 'Logout from Product Hunt',
        inputSchema: z.object({}),
      },
      {
        name: 'check_auth_status',
        description: 'Check Product Hunt authentication status',
        inputSchema: z.object({}),
      },
      {
        name: 'create_product',
        description: 'Create a new product on Product Hunt (requires authentication)',
        inputSchema: CreateProductSchema,
      },
      {
        name: 'schedule_launch',
        description: 'Schedule a product launch',
        inputSchema: ScheduleLaunchSchema,
      },
      {
        name: 'process_images',
        description: 'Process and optimize images for Product Hunt',
        inputSchema: ProcessImagesSchema,
      },
      {
        name: 'track_launch',
        description: 'Track launch performance in real-time',
        inputSchema: TrackLaunchSchema,
      },
      {
        name: 'generate_launch_report',
        description: 'Generate a detailed launch report',
        inputSchema: GenerateLaunchReportSchema,
      },
      {
        name: 'get_trending',
        description: 'Get trending products on Product Hunt',
        inputSchema: z.object({
          period: z.enum(['day', 'week', 'month']).default('day'),
          limit: z.number().default(10),
        }),
      },
      {
        name: 'find_hunters',
        description: 'Find top hunters for your product category',
        inputSchema: z.object({
          category: z.string(),
          minFollowers: z.number().default(1000),
        }),
      },
      {
        name: 'optimize_launch_time',
        description: 'Get optimal launch time based on analytics',
        inputSchema: z.object({
          category: z.string(),
          targetAudience: z.enum(['US', 'EU', 'ASIA', 'GLOBAL']).default('GLOBAL'),
        }),
      },
    ],
  };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'launch_checklist',
        description: 'Complete Product Hunt launch checklist',
      },
      {
        name: 'product_description',
        description: 'Generate compelling product description',
      },
      {
        name: 'hunter_outreach',
        description: 'Template for reaching out to hunters',
      },
      {
        name: 'launch_announcement',
        description: 'Social media launch announcement template',
      },
    ],
  };
});

// Get prompt content
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompts: Record<string, any> = {
    launch_checklist: {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Generate a comprehensive Product Hunt launch checklist',
          },
        },
      ],
    },
    product_description: {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Help me write a compelling product description for Product Hunt. My product is: {{PRODUCT_NAME}}',
          },
        },
      ],
    },
    hunter_outreach: {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Create an outreach message for Product Hunt hunters. Product: {{PRODUCT_NAME}}, Category: {{CATEGORY}}',
          },
        },
      ],
    },
    launch_announcement: {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Create social media posts announcing our Product Hunt launch. Product: {{PRODUCT_NAME}}, Tagline: {{TAGLINE}}',
          },
        },
      ],
    },
  };

  const prompt = prompts[request.params.name];
  if (!prompt) {
    throw new Error(`Prompt not found: ${request.params.name}`);
  }

  return prompt;
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'login_producthunt': {
        // Start auth server if not running
        if (!authServer) {
          authServer = new AuthServer({
            clientId: config.productHunt.clientId,
            clientSecret: config.productHunt.clientSecret,
            redirectUri: config.auth?.redirectUri || 'http://localhost:8080/callback',
            port: config.auth?.port || 8080,
            tokenStorePath: config.auth?.tokenStorePath || '.auth/tokens.json',
          });
          await authServer.start();
        }

        // Open login page in browser
        await open(`http://localhost:${config.auth?.port || 8080}`);
        
        // Wait for authentication (max 2 minutes)
        const token = await tokenManager.waitForToken(120000);
        
        if (token) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ Successfully authenticated with Product Hunt! You can now use all features.',
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: '⚠️ Authentication timed out. Please try again.',
              },
            ],
          };
        }
      }

      case 'logout_producthunt': {
        await tokenManager.clearToken();
        return {
          content: [
            {
              type: 'text',
              text: 'Successfully logged out from Product Hunt.',
            },
          ],
        };
      }

      case 'check_auth_status': {
        const info = await tokenManager.getTokenInfo();
        
        if (info.authenticated) {
          const expiresIn = info.expiresAt 
            ? Math.round((info.expiresAt - Date.now()) / 1000 / 60)
            : 'Never';
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Authenticated\nScopes: ${info.scopes || 'N/A'}\nExpires in: ${expiresIn} minutes`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Not authenticated. Use login_producthunt to authenticate.',
              },
            ],
          };
        }
      }
      case 'create_product': {
        // Check authentication first
        const isAuthenticated = await tokenManager.hasValidToken();
        if (!isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Not authenticated. Please use login_producthunt first to authenticate with Product Hunt.',
              },
            ],
          };
        }
        
        const validated = CreateProductSchema.parse(args);
        let mediaUrls: string[] = [];
        
        if (validated.media && validated.media.length > 0) {
          console.log(chalk.blue('Processing media files...'));
          mediaUrls = await imageProcessor.processMultiple(validated.media);
        }
        
        const product = await productHuntAPI.createProduct({
          ...validated,
          media: mediaUrls,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Product created successfully!\nID: ${product.id}\nName: ${product.name}\nURL: ${product.url}`,
            },
          ],
        };
      }

      case 'schedule_launch': {
        const validated = ScheduleLaunchSchema.parse(args);
        const launch = await launchManager.scheduleLaunch(validated);
        
        return {
          content: [
            {
              type: 'text',
              text: `Launch scheduled for ${launch.date}\nProduct: ${launch.productName}\nHunters: ${launch.hunters?.join(', ') || 'None'}`,
            },
          ],
        };
      }

      case 'process_images': {
        const validated = ProcessImagesSchema.parse(args);
        const processed = await imageProcessor.processFolder(
          validated.folderPath,
          {
            format: validated.outputFormat,
            maxWidth: validated.maxWidth,
            maxHeight: validated.maxHeight,
          }
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Processed ${processed.count} images\nOutput: ${processed.outputPath}\nFormats: ${processed.formats.join(', ')}`,
            },
          ],
        };
      }

      case 'track_launch': {
        const validated = TrackLaunchSchema.parse(args);
        const tracking = await analytics.startTracking(
          validated.productId,
          validated.interval
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Tracking started for product ${validated.productId}\nUpdate interval: ${validated.interval} minutes\nDashboard: ${tracking.dashboardUrl}`,
            },
          ],
        };
      }

      case 'generate_launch_report': {
        const validated = GenerateLaunchReportSchema.parse(args);
        const report = await analytics.generateReport(
          validated.productId,
          validated.includeCompetitors
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Launch Report:\n\nVotes: ${report.votes}\nComments: ${report.comments}\nRank: #${report.rank}\nConversion: ${report.conversion}%\n\n${validated.includeCompetitors ? `Top Competitors:\n${report.competitors?.map(c => `- ${c.name}: ${c.votes} votes`).join('\n')}` : ''}`,
            },
          ],
        };
      }

      case 'get_trending': {
        const validated = z.object({
          period: z.enum(['day', 'week', 'month']).default('day'),
          limit: z.number().default(10),
        }).parse(args);
        
        const trending = await productHuntAPI.getTrending(validated.period, validated.limit);
        
        return {
          content: [
            {
              type: 'text',
              text: `Trending Products (${validated.period}):\n\n${trending.map((p, i) => `${i + 1}. ${p.name} - ${p.votes} votes\n   ${p.tagline}\n   ${p.url}`).join('\n\n')}`,
            },
          ],
        };
      }

      case 'find_hunters': {
        const validated = z.object({
          category: z.string(),
          minFollowers: z.number().default(1000),
        }).parse(args);
        
        const hunters = await productHuntAPI.findHunters(validated.category, validated.minFollowers);
        
        return {
          content: [
            {
              type: 'text',
              text: `Top Hunters for ${validated.category}:\n\n${hunters.map(h => `- ${h.name} (@${h.username})\n  Followers: ${h.followers}\n  Hunts: ${h.huntsCount}`).join('\n\n')}`,
            },
          ],
        };
      }

      case 'optimize_launch_time': {
        const validated = z.object({
          category: z.string(),
          targetAudience: z.enum(['US', 'EU', 'ASIA', 'GLOBAL']).default('GLOBAL'),
        }).parse(args);
        
        const optimal = await analytics.getOptimalLaunchTime(
          validated.category,
          validated.targetAudience
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Optimal Launch Time:\n\nDay: ${optimal.day}\nTime: ${optimal.time} (${optimal.timezone})\nReason: ${optimal.reason}\n\nHistorical Performance:\n- Average votes at this time: ${optimal.avgVotes}\n- Success rate: ${optimal.successRate}%`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(chalk.green('🚀 LaunchPal MCP Server running'));
  
  // Check initial auth status
  const isAuthenticated = await tokenManager.hasValidToken();
  if (!isAuthenticated) {
    console.error(chalk.yellow('⚠️  Not authenticated. Use login_producthunt tool to authenticate.'));
  } else {
    console.error(chalk.green('✅ Authenticated with Product Hunt'));
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (authServer) {
    await authServer.stop();
  }
  process.exit(0);
});