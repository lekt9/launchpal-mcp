import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { TokenManager } from '../auth/tokenManager.js';

export interface ProductHuntConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  apiUrl: string;
  tokenManager?: TokenManager;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votes: number;
  comments: number;
  featured: boolean;
  media: string[];
}

export interface Hunter {
  id: string;
  name: string;
  username: string;
  followers: number;
  huntsCount: number;
  profileUrl: string;
}

export class ProductHuntAPI {
  private client: AxiosInstance;
  private accessToken: string | undefined;
  private tokenManager: TokenManager | undefined;

  constructor(private config: ProductHuntConfig) {
    this.accessToken = config.accessToken;
    this.tokenManager = config.tokenManager;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    }
  }

  async authenticate(): Promise<string> {
    // First try to get token from TokenManager if available
    if (this.tokenManager) {
      const managedToken = await this.tokenManager.getAccessToken();
      if (managedToken) {
        this.accessToken = managedToken;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        return this.accessToken;
      }
    }

    // Fall back to existing token if available
    if (this.accessToken) return this.accessToken;

    // If no token manager and no token, throw error (user needs to authenticate)
    throw new Error('Not authenticated. Please use the login_producthunt tool to authenticate first.');
  }

  async createProduct(data: {
    name: string;
    tagline: string;
    description: string;
    website: string;
    topics: string[];
    media?: string[];
  }): Promise<Product> {
    await this.authenticate();

    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          post {
            id
            name
            tagline
            description
            url
            votesCount
            commentsCount
            featured
            media {
              url
            }
          }
        }
      }
    `;

    const variables = {
      input: {
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        url: data.website,
        topics: data.topics,
        media: data.media || [],
      },
    };

    const response = await this.client.post('', {
      query: mutation,
      variables,
    });

    const post = response.data.data.createPost.post;
    return {
      id: post.id,
      name: post.name,
      tagline: post.tagline,
      description: post.description,
      url: post.url,
      votes: post.votesCount,
      comments: post.commentsCount,
      featured: post.featured,
      media: post.media.map((m: any) => m.url),
    };
  }

  async getProduct(productId: string): Promise<Product> {
    await this.authenticate();

    const query = `
      query GetPost($id: ID!) {
        post(id: $id) {
          id
          name
          tagline
          description
          url
          votesCount
          commentsCount
          featured
          media {
            url
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { id: productId },
    });

    const post = response.data.data.post;
    return {
      id: post.id,
      name: post.name,
      tagline: post.tagline,
      description: post.description,
      url: post.url,
      votes: post.votesCount,
      comments: post.commentsCount,
      featured: post.featured,
      media: post.media.map((m: any) => m.url),
    };
  }

  async getTrending(period: 'day' | 'week' | 'month', limit: number = 10): Promise<Product[]> {
    await this.authenticate();

    const query = `
      query GetTrending($first: Int!, $order: PostsOrder!) {
        posts(first: $first, order: $order) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              featured
              media {
                url
              }
            }
          }
        }
      }
    `;

    const orderMap = {
      day: 'VOTES_COUNT',
      week: 'WEEKLY_RANK',
      month: 'RANKING',
    };

    const response = await this.client.post('', {
      query,
      variables: {
        first: limit,
        order: orderMap[period],
      },
    });

    return response.data.data.posts.edges.map((edge: any) => {
      const post = edge.node;
      return {
        id: post.id,
        name: post.name,
        tagline: post.tagline,
        description: post.description,
        url: post.url,
        votes: post.votesCount,
        comments: post.commentsCount,
        featured: post.featured,
        media: post.media.map((m: any) => m.url),
      };
    });
  }

  async findHunters(category: string, minFollowers: number = 1000): Promise<Hunter[]> {
    await this.authenticate();

    const query = `
      query FindHunters($topic: String!, $first: Int!) {
        topic(slug: $topic) {
          users(first: $first, order: FOLLOWERS_COUNT) {
            edges {
              node {
                id
                name
                username
                followersCount
                madePosts {
                  totalCount
                }
                profileUrl
              }
            }
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: {
        topic: category.toLowerCase(),
        first: 50,
      },
    });

    const users = response.data.data.topic.users.edges
      .map((edge: any) => {
        const user = edge.node;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          followers: user.followersCount,
          huntsCount: user.madePosts.totalCount,
          profileUrl: user.profileUrl,
        };
      })
      .filter((user: Hunter) => user.followers >= minFollowers)
      .slice(0, 20);

    return users;
  }

  async uploadMedia(filePath: string): Promise<string> {
    await this.authenticate();

    const formData = new FormData();
    formData.append('file', filePath);

    const response = await axios.post(
      'https://api.producthunt.com/v2/api/media',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data.url;
  }

  async voteForProduct(productId: string): Promise<boolean> {
    await this.authenticate();

    const mutation = `
      mutation Vote($id: ID!) {
        vote(postId: $id) {
          success
        }
      }
    `;

    const response = await this.client.post('', {
      query: mutation,
      variables: { id: productId },
    });

    return response.data.data.vote.success;
  }

  async getComments(productId: string, limit: number = 50): Promise<any[]> {
    await this.authenticate();

    const query = `
      query GetComments($id: ID!, $first: Int!) {
        post(id: $id) {
          comments(first: $first) {
            edges {
              node {
                id
                body
                votesCount
                user {
                  name
                  username
                }
                createdAt
              }
            }
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { id: productId, first: limit },
    });

    return response.data.data.post.comments.edges.map((edge: any) => edge.node);
  }
}