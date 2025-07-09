import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { ImageData } from "../types/nft.types";

export class ImageGeneratorService {
  private templatePath: string;
  private outputDir: string;
  private baseTemplate: Buffer | null = null;
  private fontDataUri: string | null = null;

  constructor() {
    this.templatePath =
      process.env.IMAGE_TEMPLATE_PATH || "./assets/nft-template.png";
    this.outputDir = process.env.TEMP_IMAGE_DIR || "./temp/images";
  }

  async initialize(): Promise<void> {
    await this.ensureOutputDir();

    try {
      this.baseTemplate = await fs.readFile(this.templatePath);
      console.log(`✅ Base template loaded: ${this.templatePath}`);
    } catch (error) {
      console.error(`❌ Failed to load base template: ${this.templatePath}`);
      throw new Error(
        `Template not found: ${this.templatePath}. Please ensure the base image exists.`
      );
    }

    try {
      const fontPath = path.resolve(
        process.cwd(),
        "assets/fonts/DMSans-Medium.ttf"
      );
      const fontBuffer = await fs.readFile(fontPath);
      this.fontDataUri = `data:font/ttf;base64,${fontBuffer.toString(
        "base64"
      )}`;
      console.log("✅ DM Sans font loaded successfully.");
    } catch (error) {
      console.warn("⚠️ DM Sans font not found. Falling back to system fonts.");
    }
  }

  async generateNFTImage(data: ImageData, mint: string): Promise<string> {
    if (!this.baseTemplate || !this.fontDataUri) {
      await this.initialize();
    }

    try {
      const filename = `nft-${mint}-${Date.now()}.png`;
      const filepath = path.join(this.outputDir, filename);
      const textSvg = this.generateTextOverlaySvg(data);

      await sharp(this.baseTemplate!)
        .resize(512, 512)
        .composite([
          {
            input: Buffer.from(textSvg),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toFile(filepath);

      console.log(`🖼️ Generated NFT image: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Error generating NFT image: ${error}`);
      throw error;
    }
  }

  private generateTextOverlaySvg(data: ImageData): string {
    const dociFontSize = this.calculateOptimalFontSize(data.doci, 32, 20);
    const titleFontSize = this.calculateOptimalFontSize(data.title, 22, 14);
    const ownerFontSize = 18;

    const displayDoci =
      data.doci.length > 40 ? data.doci.substring(0, 37) + "..." : data.doci;
    const displayTitle = data.title;
    const displayOwner =
      data.ownerName.length > 30
        ? data.ownerName.substring(0, 27) + "..."
        : data.ownerName;

    const fontFamily = this.fontDataUri ? "DM Sans" : "Arial, sans-serif";

    return `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="1" dy="1" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <style>
            @font-face {
              font-family: 'DM Sans';
              src: url("${this.fontDataUri}");
            }
            .doci-text { 
              font-family: ${fontFamily}; 
              font-weight: bold; 
              font-size: ${dociFontSize}px; 
              fill: #ffffff; 
              text-anchor: middle; 
              filter: url(#shadow);
            }
            .title-text { 
              font-family: ${fontFamily}; 
              font-size: ${titleFontSize}px; 
              fill: #eeeeee; 
              text-anchor: middle; 
              filter: url(#shadow);
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 450px;
              overflow: hidden;
            }
            .owner-text { 
              font-family: ${fontFamily}; 
              font-size: ${ownerFontSize}px; 
              fill: #dddddd; 
              text-anchor: middle; 
              filter: url(#shadow);
            }
            .date-text { 
              font-family: ${fontFamily}; 
              font-size: 14px; 
              fill: #cccccc; 
              text-anchor: middle; 
              filter: url(#shadow);
            }
            .label-text { 
              font-family: ${fontFamily}; 
              font-size: 12px; 
              fill: #bbbbbb; 
              text-anchor: middle; 
              filter: url(#shadow);
            }
          </style>
        </defs>
        
        <text x="256" y="180" class="doci-text">${this.escapeXml(
          displayDoci
        )}</text>
        
        ${this.generateMultilineText(
          displayTitle,
          256,
          230,
          titleFontSize,
          fontFamily,
          "#eeeeee",
          450,
          3
        )}
        
        <text x="256" y="340" class="owner-text">Author: ${this.escapeXml(
          displayOwner
        )}</text>
        
        <text x="256" y="370" class="date-text">Published: ${
          data.publicationDate
        }</text>
        
        <text x="256" y="480" class="label-text">Fronsciers Academic NFT</text>
      </svg>
    `;
  }

  private generateMultilineText(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: string,
    maxWidth: number,
    maxLines: number = 2
  ): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    const maxCharsPerLine = Math.floor(maxWidth / (fontSize * 0.6));

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      if (testLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const limitedLines = lines.slice(0, maxLines);

    return limitedLines
      .map(
        (line, index) =>
          `<text x="${x}" y="${
            y + index * (fontSize + 4)
          }" style="font-family: ${fontFamily}; font-size: ${fontSize}px; fill: ${color}; text-anchor: middle; filter: url(#shadow);">${this.escapeXml(
            line
          )}</text>`
      )
      .join("\n");
  }

  private calculateOptimalFontSize(
    text: string,
    maxSize: number,
    minSize: number
  ): number {
    if (text.length > 40) return minSize;
    if (text.length > 25) return Math.floor((maxSize + minSize) / 2);
    return maxSize;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.outputDir}`);
    }
  }

  async cleanup(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      console.log(`🗑️ Cleaned up temp file: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup temp file: ${filepath}`, error);
    }
  }
}
