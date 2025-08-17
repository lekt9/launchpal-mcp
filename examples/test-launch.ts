#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

async function main() {
  console.log(chalk.blue('🚀 LaunchPal MCP Test Client\n'));

  // Start the MCP server
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client({
    name: 'launchpal-test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await client.connect(transport);

  console.log(chalk.green('✅ Connected to LaunchPal MCP Server\n'));

  // Example 1: Get trending products
  console.log(chalk.yellow('📊 Getting trending products...'));
  try {
    const trending = await client.callTool('get_trending', {
      period: 'day',
      limit: 5,
    });
    console.log('Trending products:', trending);
  } catch (error) {
    console.error(chalk.red('Error getting trending:'), error);
  }

  // Example 2: Process images from a folder
  console.log(chalk.yellow('\n🖼️  Processing images...'));
  try {
    const processed = await client.callTool('process_images', {
      folderPath: './examples/sample-images',
      outputFormat: 'gallery',
      maxWidth: 1270,
      maxHeight: 760,
    });
    console.log('Processed images:', processed);
  } catch (error) {
    console.error(chalk.red('Error processing images:'), error);
  }

  // Example 3: Get optimal launch time
  console.log(chalk.yellow('\n⏰ Getting optimal launch time...'));
  try {
    const optimal = await client.callTool('optimize_launch_time', {
      category: 'productivity',
      targetAudience: 'US',
    });
    console.log('Optimal launch time:', optimal);
  } catch (error) {
    console.error(chalk.red('Error getting optimal time:'), error);
  }

  // Example 4: Generate launch checklist prompt
  console.log(chalk.yellow('\n📝 Getting launch checklist...'));
  try {
    const checklist = await client.getPrompt('launch_checklist', {});
    console.log('Launch checklist prompt:', checklist);
  } catch (error) {
    console.error(chalk.red('Error getting checklist:'), error);
  }

  // Cleanup
  await client.close();
  serverProcess.kill();
  
  console.log(chalk.green('\n✅ Test completed successfully!'));
}

// Test data for creating a product
const testProduct = {
  name: 'LaunchPal MCP',
  tagline: 'Automate your Product Hunt launch with AI',
  description: `LaunchPal MCP is a powerful Model Context Protocol server that automates every aspect of your Product Hunt launch.

Features:
- 🚀 Automated launch scheduling and execution
- 🖼️ Intelligent image processing and optimization
- 📊 Real-time analytics and performance tracking
- 🤖 AI-powered engagement and response automation
- 📈 Predictive analytics and competitor analysis

Perfect for makers, startups, and agencies looking to maximize their Product Hunt success.`,
  website: 'https://github.com/yourusername/launchpal',
  topics: ['productivity', 'automation', 'ai', 'developer-tools'],
  media: ['./examples/sample-images/screenshot1.png', './examples/sample-images/screenshot2.png'],
};

// Test scheduling a launch
const testLaunch = {
  productId: 'test_product_123',
  launchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  hunters: ['chrismessina', 'rrhoover'],
  notifySubscribers: true,
};

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});