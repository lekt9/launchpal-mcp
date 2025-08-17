import cron from 'node-cron';
import { ProductHuntAPI, Product } from './producthunt.js';

export interface LaunchMetrics {
  productId: string;
  timestamp: Date;
  votes: number;
  comments: number;
  rank?: number;
  velocity: number; // votes per hour
  engagement: number; // comments to votes ratio
  conversion?: number; // percentage of visitors who voted
}

export interface LaunchReport {
  productId: string;
  productName: string;
  launchDate: Date;
  votes: number;
  comments: number;
  rank: number;
  conversion: number;
  peakHour: string;
  topReferrers: string[];
  competitors?: CompetitorAnalysis[];
  timeline: LaunchMetrics[];
}

export interface CompetitorAnalysis {
  name: string;
  votes: number;
  comments: number;
  rank: number;
  category: string;
}

export interface OptimalTiming {
  day: string;
  time: string;
  timezone: string;
  reason: string;
  avgVotes: number;
  successRate: number;
}

export class AnalyticsTracker {
  private trackingTasks: Map<string, cron.ScheduledTask> = new Map();
  private metricsData: Map<string, LaunchMetrics[]> = new Map();
  private dashboardPort: number = 3000;

  constructor(private productHuntAPI?: ProductHuntAPI) {
    if (!this.productHuntAPI) {
      this.productHuntAPI = new ProductHuntAPI({
        clientId: process.env.PRODUCTHUNT_CLIENT_ID || '',
        clientSecret: process.env.PRODUCTHUNT_CLIENT_SECRET || '',
        apiUrl: 'https://api.producthunt.com/v2/api/graphql',
      });
    }
  }

  async startTracking(
    productId: string,
    intervalMinutes: number = 30
  ): Promise<{ dashboardUrl: string; trackingId: string }> {
    // Stop existing tracking if any
    this.stopTracking(productId);

    // Initialize metrics array
    if (!this.metricsData.has(productId)) {
      this.metricsData.set(productId, []);
    }

    // Create tracking task
    const task = cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      await this.collectMetrics(productId);
    });

    this.trackingTasks.set(productId, task);

    // Collect initial metrics
    await this.collectMetrics(productId);

    return {
      dashboardUrl: `http://localhost:${this.dashboardPort}/dashboard/${productId}`,
      trackingId: productId,
    };
  }

  stopTracking(productId: string): boolean {
    const task = this.trackingTasks.get(productId);
    if (task) {
      task.stop();
      this.trackingTasks.delete(productId);
      return true;
    }
    return false;
  }

  private async collectMetrics(productId: string): Promise<LaunchMetrics> {
    const product = await this.productHuntAPI!.getProduct(productId);
    const metrics = this.metricsData.get(productId) || [];
    
    // Calculate velocity
    let velocity = 0;
    if (metrics.length > 0) {
      const lastMetric = metrics[metrics.length - 1];
      const timeDiff = (Date.now() - lastMetric.timestamp.getTime()) / (1000 * 60 * 60); // hours
      velocity = (product.votes - lastMetric.votes) / timeDiff;
    }

    // Calculate engagement
    const engagement = product.comments / Math.max(product.votes, 1);

    const newMetric: LaunchMetrics = {
      productId,
      timestamp: new Date(),
      votes: product.votes,
      comments: product.comments,
      velocity,
      engagement,
    };

    metrics.push(newMetric);
    this.metricsData.set(productId, metrics);

    console.log(`📊 Metrics collected for ${productId}: ${product.votes} votes, ${velocity.toFixed(1)} votes/hour`);

    return newMetric;
  }

  async generateReport(
    productId: string,
    includeCompetitors: boolean = false
  ): Promise<LaunchReport> {
    const product = await this.productHuntAPI!.getProduct(productId);
    const metrics = this.metricsData.get(productId) || [];

    // Calculate peak hour
    let peakHour = 'N/A';
    let maxVelocity = 0;
    metrics.forEach(metric => {
      if (metric.velocity > maxVelocity) {
        maxVelocity = metric.velocity;
        peakHour = metric.timestamp.toLocaleTimeString();
      }
    });

    // Get competitors if requested
    let competitors: CompetitorAnalysis[] | undefined;
    if (includeCompetitors) {
      competitors = await this.analyzeCompetitors(product);
    }

    // Calculate conversion (mock data for demo)
    const conversion = Math.random() * 5 + 2; // 2-7% conversion

    const report: LaunchReport = {
      productId,
      productName: product.name,
      launchDate: new Date(), // Would get actual launch date from tracking
      votes: product.votes,
      comments: product.comments,
      rank: await this.calculateRank(productId),
      conversion: parseFloat(conversion.toFixed(2)),
      peakHour,
      topReferrers: ['Twitter', 'LinkedIn', 'Direct', 'Email'],
      competitors,
      timeline: metrics,
    };

    return report;
  }

  private async calculateRank(productId: string): Promise<number> {
    // Get today's products and find rank
    const trending = await this.productHuntAPI!.getTrending('day', 100);
    const index = trending.findIndex(p => p.id === productId);
    return index >= 0 ? index + 1 : 999;
  }

  private async analyzeCompetitors(product: Product): Promise<CompetitorAnalysis[]> {
    // Get products from the same day
    const trending = await this.productHuntAPI!.getTrending('day', 20);
    
    // Filter similar products (mock categorization)
    const competitors = trending
      .filter(p => p.id !== product.id)
      .slice(0, 5)
      .map((p, index) => ({
        name: p.name,
        votes: p.votes,
        comments: p.comments,
        rank: index + 1,
        category: 'Productivity', // Would derive from actual categories
      }));

    return competitors;
  }

  async getOptimalLaunchTime(
    category: string,
    targetAudience: 'US' | 'EU' | 'ASIA' | 'GLOBAL'
  ): Promise<OptimalTiming> {
    // This would analyze historical data for the category
    // For demo, return optimized times based on research
    
    const timings: Record<string, OptimalTiming> = {
      US: {
        day: 'Tuesday',
        time: '12:01 AM PST',
        timezone: 'America/Los_Angeles',
        reason: 'Product Hunt resets at midnight PST. Tuesday has highest engagement.',
        avgVotes: 450,
        successRate: 68,
      },
      EU: {
        day: 'Tuesday',
        time: '09:00 AM GMT',
        timezone: 'Europe/London',
        reason: 'Catches both EU morning and US late night audiences.',
        avgVotes: 380,
        successRate: 62,
      },
      ASIA: {
        day: 'Tuesday',
        time: '09:00 AM JST',
        timezone: 'Asia/Tokyo',
        reason: 'Optimal for APAC region with spillover to EU/US.',
        avgVotes: 320,
        successRate: 58,
      },
      GLOBAL: {
        day: 'Tuesday',
        time: '12:01 AM PST',
        timezone: 'UTC',
        reason: 'Best overall coverage across all time zones.',
        avgVotes: 400,
        successRate: 65,
      },
    };

    return timings[targetAudience] || timings.GLOBAL;
  }

  async predictPerformance(
    productId: string,
    hoursAhead: number = 24
  ): Promise<{
    predictedVotes: number;
    predictedRank: number;
    confidence: number;
  }> {
    const metrics = this.metricsData.get(productId) || [];
    
    if (metrics.length < 2) {
      return {
        predictedVotes: 0,
        predictedRank: 999,
        confidence: 0,
      };
    }

    // Calculate average velocity
    const avgVelocity = metrics.reduce((sum, m) => sum + m.velocity, 0) / metrics.length;
    const currentVotes = metrics[metrics.length - 1].votes;
    
    // Predict votes
    const predictedVotes = Math.round(currentVotes + (avgVelocity * hoursAhead));
    
    // Estimate rank based on typical vote distributions
    let predictedRank = 1;
    if (predictedVotes < 100) predictedRank = 20;
    else if (predictedVotes < 200) predictedRank = 10;
    else if (predictedVotes < 400) predictedRank = 5;
    else if (predictedVotes < 600) predictedRank = 3;
    
    // Calculate confidence based on data consistency
    const velocityVariance = this.calculateVariance(metrics.map(m => m.velocity));
    const confidence = Math.max(0, Math.min(100, 100 - velocityVariance * 10));

    return {
      predictedVotes,
      predictedRank,
      confidence: Math.round(confidence),
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  async compareToHistorical(
    productId: string,
    category: string
  ): Promise<{
    performanceRating: 'below' | 'average' | 'above' | 'exceptional';
    percentile: number;
    similarProducts: Array<{ name: string; votes: number; daysAgo: number }>;
  }> {
    const product = await this.productHuntAPI!.getProduct(productId);
    
    // Mock historical data for demo
    const historicalAvg = 350;
    const percentile = Math.min(99, Math.round((product.votes / historicalAvg) * 50));
    
    let performanceRating: 'below' | 'average' | 'above' | 'exceptional';
    if (percentile < 25) performanceRating = 'below';
    else if (percentile < 50) performanceRating = 'average';
    else if (percentile < 75) performanceRating = 'above';
    else performanceRating = 'exceptional';

    // Mock similar products
    const similarProducts = [
      { name: 'Similar Product A', votes: 420, daysAgo: 7 },
      { name: 'Similar Product B', votes: 380, daysAgo: 14 },
      { name: 'Similar Product C', votes: 290, daysAgo: 30 },
    ];

    return {
      performanceRating,
      percentile,
      similarProducts,
    };
  }

  getMetrics(productId: string): LaunchMetrics[] {
    return this.metricsData.get(productId) || [];
  }

  exportMetrics(productId: string, format: 'json' | 'csv' = 'json'): string {
    const metrics = this.metricsData.get(productId) || [];
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    } else {
      // CSV format
      const headers = 'Timestamp,Votes,Comments,Velocity,Engagement\n';
      const rows = metrics.map(m => 
        `${m.timestamp.toISOString()},${m.votes},${m.comments},${m.velocity.toFixed(2)},${m.engagement.toFixed(3)}`
      ).join('\n');
      
      return headers + rows;
    }
  }
}