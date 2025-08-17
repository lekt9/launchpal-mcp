import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import FormData from 'form-data';
import axios from 'axios';

export interface ImageConfig {
  uploadDir: string;
  maxFileSize: number;
  allowedFormats: string[];
  outputQuality: number;
}

export interface ProcessOptions {
  format?: 'gallery' | 'thumbnail' | 'banner';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  watermark?: string;
}

export interface ProcessedImage {
  originalPath: string;
  processedPath: string;
  url?: string;
  dimensions: {
    width: number;
    height: number;
  };
  size: number;
  format: string;
}

export class ImageProcessor {
  private uploadDir: string;

  constructor(private config: ImageConfig) {
    this.uploadDir = config.uploadDir;
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async processImage(
    inputPath: string,
    options: ProcessOptions = {}
  ): Promise<ProcessedImage> {
    const {
      format = 'gallery',
      maxWidth = 1200,
      maxHeight = 800,
      quality = this.config.outputQuality,
      watermark,
    } = options;

    // Validate file exists
    const stats = await fs.stat(inputPath);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Get file extension
    const ext = path.extname(inputPath).toLowerCase().slice(1);
    if (!this.config.allowedFormats.includes(ext)) {
      throw new Error(`File format '${ext}' is not allowed`);
    }

    // Define dimensions based on format
    const dimensions = this.getFormatDimensions(format, maxWidth, maxHeight);
    
    // Generate output filename
    const basename = path.basename(inputPath, path.extname(inputPath));
    const outputFilename = `${basename}_${format}_${Date.now()}.jpg`;
    const outputPath = path.join(this.uploadDir, outputFilename);

    // Process the image
    let pipeline = sharp(inputPath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality });

    // Add watermark if provided
    if (watermark) {
      const watermarkBuffer = await this.createWatermark(watermark);
      pipeline = pipeline.composite([
        {
          input: watermarkBuffer,
          gravity: 'southeast',
        },
      ]);
    }

    // Save the processed image
    const info = await pipeline.toFile(outputPath);

    return {
      originalPath: inputPath,
      processedPath: outputPath,
      dimensions: {
        width: info.width,
        height: info.height,
      },
      size: info.size,
      format: info.format,
    };
  }

  async processMultiple(
    imagePaths: string[],
    options: ProcessOptions = {}
  ): Promise<string[]> {
    const processedImages = await Promise.all(
      imagePaths.map(path => this.processImage(path, options))
    );

    // Upload to CDN or return local URLs
    const urls = await Promise.all(
      processedImages.map(img => this.uploadToCDN(img.processedPath))
    );

    return urls;
  }

  async processFolder(
    folderPath: string,
    options: ProcessOptions = {}
  ): Promise<{
    count: number;
    outputPath: string;
    formats: string[];
    images: ProcessedImage[];
  }> {
    // Read all files in the folder
    const files = await fs.readdir(folderPath);
    
    // Filter image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase().slice(1);
      return this.config.allowedFormats.includes(ext);
    });

    if (imageFiles.length === 0) {
      throw new Error('No valid image files found in the specified folder');
    }

    // Create output subfolder
    const outputFolder = path.join(this.uploadDir, `batch_${Date.now()}`);
    await fs.mkdir(outputFolder, { recursive: true });

    // Process each image
    const processedImages: ProcessedImage[] = [];
    const formats = new Set<string>();

    for (const file of imageFiles) {
      const inputPath = path.join(folderPath, file);
      
      // Process for different formats if needed
      if (options.format === 'gallery') {
        // Create multiple sizes for gallery
        const sizes = [
          { format: 'thumbnail', maxWidth: 300, maxHeight: 300 },
          { format: 'gallery', maxWidth: 1200, maxHeight: 800 },
          { format: 'banner', maxWidth: 1920, maxHeight: 600 },
        ];

        for (const size of sizes) {
          const processed = await this.processImage(inputPath, {
            ...options,
            ...size,
          } as ProcessOptions);
          processedImages.push(processed);
          formats.add(size.format);
        }
      } else {
        const processed = await this.processImage(inputPath, options);
        processedImages.push(processed);
        formats.add(options.format || 'gallery');
      }
    }

    return {
      count: processedImages.length,
      outputPath: outputFolder,
      formats: Array.from(formats),
      images: processedImages,
    };
  }

  private getFormatDimensions(
    format: string,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    switch (format) {
      case 'thumbnail':
        return { width: 300, height: 300 };
      case 'banner':
        return { width: 1920, height: 600 };
      case 'gallery':
      default:
        return { width: maxWidth, height: maxHeight };
    }
  }

  private async createWatermark(text: string): Promise<Buffer> {
    const svg = `
      <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="35" font-family="Arial" font-size="20" fill="white" opacity="0.7">
          ${text}
        </text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  async uploadToCDN(filePath: string): Promise<string> {
    // This is a placeholder for CDN upload
    // In production, you would upload to services like Cloudinary, AWS S3, etc.
    
    // For now, return a local file URL
    return `file://${filePath}`;
  }

  async optimizeForProductHunt(imagePath: string): Promise<ProcessedImage> {
    // Product Hunt specific optimizations
    return this.processImage(imagePath, {
      format: 'gallery',
      maxWidth: 1270,  // Product Hunt gallery width
      maxHeight: 760,  // Product Hunt gallery height
      quality: 85,
    });
  }

  async createCollage(
    imagePaths: string[],
    outputPath?: string
  ): Promise<string> {
    if (imagePaths.length === 0) {
      throw new Error('No images provided for collage');
    }

    const maxImages = Math.min(imagePaths.length, 4); // Max 4 images in collage
    const collageWidth = 1200;
    const collageHeight = 800;
    const tileWidth = collageWidth / 2;
    const tileHeight = collageHeight / 2;

    // Process and resize images
    const composites = await Promise.all(
      imagePaths.slice(0, maxImages).map(async (imagePath, index) => {
        const resized = await sharp(imagePath)
          .resize(tileWidth, tileHeight, { fit: 'cover' })
          .toBuffer();

        const x = (index % 2) * tileWidth;
        const y = Math.floor(index / 2) * tileHeight;

        return {
          input: resized,
          left: x,
          top: y,
        };
      })
    );

    // Create blank canvas
    const output = outputPath || path.join(this.uploadDir, `collage_${Date.now()}.jpg`);
    
    await sharp({
      create: {
        width: collageWidth,
        height: collageHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(composites)
      .jpeg({ quality: this.config.outputQuality })
      .toFile(output);

    return output;
  }

  async extractMetadata(imagePath: string): Promise<any> {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      fileSize: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }
}