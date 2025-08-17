import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig();

const ConfigSchema = z.object({
  productHunt: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    accessToken: z.string().optional(),
    apiUrl: z.string().default('https://api.producthunt.com/v2/api/graphql'),
  }),
  auth: z.object({
    port: z.number().default(8080),
    redirectUri: z.string().default('http://localhost:8080/callback'),
    tokenStorePath: z.string().default('.auth/tokens.json'),
  }).optional(),
  images: z.object({
    uploadDir: z.string().default(path.join(__dirname, '../uploads')),
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    allowedFormats: z.array(z.string()).default(['jpg', 'jpeg', 'png', 'gif', 'webp']),
    outputQuality: z.number().default(90),
  }),
  analytics: z.object({
    enabled: z.boolean().default(true),
    dashboardPort: z.number().default(3000),
    dataRetention: z.number().default(30), // days
  }),
  notifications: z.object({
    slack: z.object({
      webhookUrl: z.string().optional(),
      enabled: z.boolean().default(false),
    }),
    email: z.object({
      smtp: z.string().optional(),
      from: z.string().optional(),
      enabled: z.boolean().default(false),
    }),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const rawConfig = {
    productHunt: {
      clientId: process.env.PRODUCTHUNT_CLIENT_ID || '',
      clientSecret: process.env.PRODUCTHUNT_CLIENT_SECRET || '',
      accessToken: process.env.PRODUCTHUNT_ACCESS_TOKEN,
      apiUrl: process.env.PRODUCTHUNT_API_URL,
    },
    auth: {
      port: process.env.AUTH_PORT ? parseInt(process.env.AUTH_PORT) : undefined,
      redirectUri: process.env.AUTH_REDIRECT_URI,
      tokenStorePath: process.env.AUTH_TOKEN_PATH,
    },
    images: {
      uploadDir: process.env.UPLOAD_DIR,
      maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined,
      allowedFormats: process.env.ALLOWED_FORMATS?.split(','),
      outputQuality: process.env.OUTPUT_QUALITY ? parseInt(process.env.OUTPUT_QUALITY) : undefined,
    },
    analytics: {
      enabled: process.env.ANALYTICS_ENABLED !== 'false',
      dashboardPort: process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT) : undefined,
      dataRetention: process.env.DATA_RETENTION ? parseInt(process.env.DATA_RETENTION) : undefined,
    },
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      email: {
        smtp: process.env.SMTP_URL,
        from: process.env.EMAIL_FROM,
        enabled: !!process.env.SMTP_URL,
      },
    },
  };

  // Remove undefined values
  const cleanConfig = JSON.parse(JSON.stringify(rawConfig));
  
  return ConfigSchema.parse(cleanConfig);
}