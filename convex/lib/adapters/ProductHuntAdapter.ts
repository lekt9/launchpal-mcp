export class ProductHuntAdapter {
  private accessToken?: string;
  private clientId: string;
  private clientSecret: string;

  constructor(credentials: Record<string, string>) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch('https://api.producthunt.com/v2/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        })
      });
      
      const data = await response.json();
      this.accessToken = data.access_token;
      return true;
    } catch (error) {
      console.error('ProductHunt authentication failed:', error);
      return false;
    }
  }

  async createProduct(product: any) {
    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          id
          slug
          url
        }
      }
    `;

    const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            name: product.name,
            tagline: product.tagline,
            description: product.description,
            url: product.website,
            media: product.media
          }
        }
      })
    });

    const result = await response.json();
    const post = result.data.createPost;
    
    return {
      id: post.id,
      url: `https://www.producthunt.com/posts/${post.slug}`
    };
  }

  async scheduleLaunch(productId: string, date: Date) {
    return {
      id: `ph_launch_${Date.now()}`,
      productId,
      platformId: 'producthunt',
      scheduledAt: date,
      status: 'scheduled'
    };
  }

  async getLaunchMetrics(launchId: string) {
    const query = `
      query GetPost($id: ID!) {
        post(id: $id) {
          votesCount
          commentsCount
          rank
        }
      }
    `;

    const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { id: launchId }
      })
    });

    const result = await response.json();
    const post = result.data.post;
    
    return {
      votes: post.votesCount,
      comments: post.commentsCount,
      rank: post.rank,
      engagement: (post.votesCount + post.commentsCount * 2) / 100
    };
  }
}