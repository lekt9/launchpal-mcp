import cron from 'node-cron';
import { ProductHuntAPI, Product } from './producthunt.js';
import { ImageProcessor } from './imageProcessor.js';

export interface LaunchConfig {
  productId: string;
  launchDate: string;
  hunters?: string[];
  notifySubscribers: boolean;
  autoReply?: boolean;
  thankVoters?: boolean;
}

export interface LaunchResult {
  productId: string;
  productName: string;
  date: string;
  hunters?: string[];
  status: 'scheduled' | 'live' | 'completed';
  metrics?: {
    votes: number;
    comments: number;
    rank?: number;
  };
}

export interface LaunchStrategy {
  timing: {
    day: string;
    hour: number;
    timezone: string;
  };
  promotion: {
    channels: string[];
    messages: Map<string, string>;
  };
  engagement: {
    replyToComments: boolean;
    thankVoters: boolean;
    updateInterval: number;
  };
}

export class LaunchManager {
  private scheduledLaunches: Map<string, cron.ScheduledTask> = new Map();
  private activeLaunches: Map<string, LaunchResult> = new Map();

  constructor(
    private productHuntAPI: ProductHuntAPI,
    private imageProcessor: ImageProcessor
  ) {}

  async scheduleLaunch(config: LaunchConfig): Promise<LaunchResult> {
    const product = await this.productHuntAPI.getProduct(config.productId);
    
    const launchDate = new Date(config.launchDate);
    const now = new Date();

    if (launchDate <= now) {
      throw new Error('Launch date must be in the future');
    }

    // Create launch result
    const launch: LaunchResult = {
      productId: config.productId,
      productName: product.name,
      date: config.launchDate,
      hunters: config.hunters,
      status: 'scheduled',
    };

    // Schedule the launch
    const cronExpression = this.dateToCron(launchDate);
    const task = cron.schedule(cronExpression, async () => {
      await this.executeLaunch(launch, config);
    });

    this.scheduledLaunches.set(config.productId, task);
    this.activeLaunches.set(config.productId, launch);

    return launch;
  }

  private async executeLaunch(launch: LaunchResult, config: LaunchConfig) {
    try {
      // Update launch status
      launch.status = 'live';
      
      // Notify hunters if specified
      if (config.hunters && config.hunters.length > 0) {
        await this.notifyHunters(launch.productId, config.hunters);
      }

      // Start monitoring
      this.startMonitoring(launch.productId);

      // Auto-engagement if enabled
      if (config.autoReply) {
        this.startAutoEngagement(launch.productId);
      }

      // Thank voters if enabled
      if (config.thankVoters) {
        this.startVoterThanking(launch.productId);
      }

      console.log(`🚀 Launch executed for ${launch.productName}`);
    } catch (error) {
      console.error(`Failed to execute launch for ${launch.productId}:`, error);
      launch.status = 'completed';
    }
  }

  async cancelLaunch(productId: string): Promise<boolean> {
    const task = this.scheduledLaunches.get(productId);
    if (task) {
      task.stop();
      this.scheduledLaunches.delete(productId);
      this.activeLaunches.delete(productId);
      return true;
    }
    return false;
  }

  async createLaunchStrategy(
    productId: string,
    targetAudience: 'US' | 'EU' | 'ASIA' | 'GLOBAL'
  ): Promise<LaunchStrategy> {
    const product = await this.productHuntAPI.getProduct(productId);
    
    // Determine optimal timing based on audience
    const timing = this.getOptimalTiming(targetAudience);
    
    // Create promotion strategy
    const promotion = {
      channels: this.getPromotionChannels(product),
      messages: this.createPromotionMessages(product),
    };

    // Define engagement rules
    const engagement = {
      replyToComments: true,
      thankVoters: true,
      updateInterval: 30, // minutes
    };

    return {
      timing,
      promotion,
      engagement,
    };
  }

  private getOptimalTiming(audience: string): LaunchStrategy['timing'] {
    const timings: Record<string, LaunchStrategy['timing']> = {
      US: { day: 'Tuesday', hour: 12, timezone: 'America/Los_Angeles' },
      EU: { day: 'Tuesday', hour: 9, timezone: 'Europe/London' },
      ASIA: { day: 'Tuesday', hour: 9, timezone: 'Asia/Tokyo' },
      GLOBAL: { day: 'Tuesday', hour: 12, timezone: 'UTC' },
    };

    return timings[audience] || timings.GLOBAL;
  }

  private getPromotionChannels(product: Product): string[] {
    const channels = ['twitter', 'linkedin', 'slack'];
    
    // Add specific channels based on product category
    if (product.description.toLowerCase().includes('developer')) {
      channels.push('hackernews', 'reddit');
    }
    if (product.description.toLowerCase().includes('design')) {
      channels.push('dribbble', 'behance');
    }

    return channels;
  }

  private createPromotionMessages(product: Product): Map<string, string> {
    const messages = new Map<string, string>();

    // Twitter
    messages.set('twitter', 
      `🚀 We just launched ${product.name} on @ProductHunt!\n\n` +
      `${product.tagline}\n\n` +
      `Check it out and support us: ${product.url}\n\n` +
      `#ProductHunt #StartUp #Launch`
    );

    // LinkedIn
    messages.set('linkedin',
      `Excited to announce that ${product.name} is now live on Product Hunt! 🎉\n\n` +
      `${product.description}\n\n` +
      `We'd love your support and feedback: ${product.url}`
    );

    // Slack
    messages.set('slack',
      `Hey team! We're live on Product Hunt with ${product.name}! 🚀\n` +
      `${product.tagline}\n` +
      `Your support would mean the world: ${product.url}`
    );

    return messages;
  }

  private startMonitoring(productId: string) {
    const task = cron.schedule('*/15 * * * *', async () => {
      const launch = this.activeLaunches.get(productId);
      if (!launch || launch.status !== 'live') {
        task.stop();
        return;
      }

      const product = await this.productHuntAPI.getProduct(productId);
      launch.metrics = {
        votes: product.votes,
        comments: product.comments,
      };

      console.log(`📊 ${launch.productName}: ${product.votes} votes, ${product.comments} comments`);
    });
  }

  private startAutoEngagement(productId: string) {
    const task = cron.schedule('*/30 * * * *', async () => {
      const launch = this.activeLaunches.get(productId);
      if (!launch || launch.status !== 'live') {
        task.stop();
        return;
      }

      const comments = await this.productHuntAPI.getComments(productId, 10);
      // Auto-reply logic would go here
      console.log(`💬 Checking for new comments on ${launch.productName}`);
    });
  }

  private startVoterThanking(productId: string) {
    // This would track new voters and send thank you messages
    console.log(`🙏 Voter thanking enabled for ${productId}`);
  }

  private async notifyHunters(productId: string, hunters: string[]) {
    // Send notifications to hunters
    console.log(`📧 Notifying hunters: ${hunters.join(', ')}`);
  }

  private dateToCron(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
  }

  async prepareLaunchAssets(productId: string, assetFolder: string): Promise<{
    gallery: string[];
    thumbnail: string;
    banner: string;
  }> {
    const processedImages = await this.imageProcessor.processFolder(assetFolder, {
      format: 'gallery',
    });

    const assets = {
      gallery: [],
      thumbnail: '',
      banner: '',
    };

    for (const image of processedImages.images) {
      if (image.processedPath.includes('gallery')) {
        assets.gallery.push(image.processedPath as never);
      } else if (image.processedPath.includes('thumbnail')) {
        assets.thumbnail = image.processedPath;
      } else if (image.processedPath.includes('banner')) {
        assets.banner = image.processedPath;
      }
    }

    return assets;
  }

  async generateLaunchChecklist(productId: string): Promise<string[]> {
    const checklist = [
      '✅ Product name and tagline optimized',
      '✅ Compelling product description written',
      '✅ High-quality gallery images prepared (1270x760px)',
      '✅ Product website live and functional',
      '✅ Hunter identified and contacted',
      '✅ Launch day and time scheduled',
      '✅ Social media posts prepared',
      '✅ Email list notified',
      '✅ Team members ready to support',
      '✅ FAQ and common questions prepared',
      '✅ Competitor analysis completed',
      '✅ Press kit ready',
      '✅ Analytics tracking set up',
      '✅ Community outreach planned',
      '✅ Post-launch follow-up scheduled',
    ];

    return checklist;
  }

  getLaunches(): LaunchResult[] {
    return Array.from(this.activeLaunches.values());
  }

  getLaunchStatus(productId: string): LaunchResult | undefined {
    return this.activeLaunches.get(productId);
  }
}