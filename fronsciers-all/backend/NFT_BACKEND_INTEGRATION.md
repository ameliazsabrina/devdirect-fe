# NFT Metadata Integration Guide for Hono Backend

This guide shows how to integrate the Fronsciers NFT metadata management into your existing Hono backend.

## 📋 **Overview**

The NFT metadata system handles:

- ✅ Listening for `DOCINFTMinted` events from the smart contract
- ✅ Automatically generating NFT metadata JSON
- ✅ **Dynamic NFT image generation** with DOCI and owner information
- ✅ **IPFS storage via Pinata** for metadata and images
- ✅ Creating metadata accounts using metaboss
- ✅ REST API endpoints for manual metadata operations
- ✅ Database tracking of NFT creation status

## 🎨 **Dynamic NFT Image Generation**

### **Image Generation Strategy**

Each NFT gets a **unique, dynamically generated image** featuring:

- **DOCI Address**: The manuscript's Digital Object Citation Identifier
- **Owner Name**: Author or current owner information
- **Academic Branding**: Professional, scholarly design aesthetic
- **Fronsciers Identity**: Consistent platform branding

### **Generation Flow**

```
NFT Mint Event
      ↓
Generate Dynamic Image (DOCI + Owner)
      ↓
Upload Image to Pinata → IPFS Hash
      ↓
Generate Metadata JSON (with image IPFS URL)
      ↓
Upload Metadata to Pinata → IPFS Hash
      ↓
Create NFT Metadata Account (metaboss)
      ↓
Store in Supabase (mint address, IPFS hashes)
```

### **Image Design Features**

- **Template-Based**: Base academic design with dynamic text overlay
- **Responsive Text**: Font sizing adjusts to DOCI/name length
- **Professional Look**: Clean, university/research paper aesthetic
- **Text Handling**: Truncation and wrapping for long content

## 🌐 **IPFS Storage with Pinata**

### **Why Pinata?**

- ✅ **Reliable IPFS hosting** (better than self-hosting)
- ✅ **Programmatic API** for uploads
- ✅ **Long-term pinning** guarantees
- ✅ **Fast CDN access** for NFT marketplaces
- ✅ **Folder organization** for easy management

### **Storage Architecture**

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Manuscript    │───▶│   Pinata     │◄───│  Dynamic Image  │
│     (PDF)       │    │    IPFS      │    │ (DOCI + Owner)  │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Metadata JSON│
                       │  (on IPFS)   │
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Solana     │
                       │ NFT Metadata │
                       │   Account    │
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Supabase   │
                       │ (App Data &  │
                       │ IPFS Hashes) │
                       └──────────────┘
```

### **What Goes Where**

**Pinata IPFS:**

- ✅ Dynamic NFT images (PNG/JPG)
- ✅ NFT metadata JSON files
- ✅ Manuscript PDFs
- ✅ Thumbnail images

**Supabase Database:**

- ✅ User accounts and profiles
- ✅ Manuscript submission data
- ✅ Review process tracking
- ✅ IPFS hashes for quick lookup
- ✅ NFT mint addresses and status
- ✅ Application state and analytics

## 🚀 **Quick Integration**

### 1. **Install Dependencies**

```bash
# Core dependencies
bun add @solana/web3.js
bun add @coral-xyz/anchor

# Image generation
bun add canvas
bun add sharp

# Pinata IPFS
bun add pinata-sdk

# For metaboss CLI operations
cargo install metaboss
```

### 2. **Environment Variables**

Add to your `.env` file:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
FRONSCIERS_PROGRAM_ID=28VkA76EcTTN746SxZyYT8NTte9gofeBQ2L4N8hfYPgd

# Pinata IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token

# NFT Metadata
METADATA_BASE_URL=https://gateway.pinata.cloud/ipfs
IMAGE_TEMPLATE_PATH=./assets/nft-template.png
TEMP_IMAGE_DIR=./temp/images
```

## 📁 **Updated File Structure**

```
src/
├── routes/
│   └── nft-metadata.ts          # REST API endpoints
├── services/
│   ├── metaboss.service.ts      # Metaboss CLI wrapper
│   ├── nft-metadata.service.ts  # Core NFT metadata logic
│   ├── pinata.service.ts        # Pinata IPFS operations
│   ├── image-generator.service.ts # Dynamic image generation
│   └── solana-event.service.ts  # Event listener
├── types/
│   └── nft.types.ts             # TypeScript interfaces
├── utils/
│   └── nft-metadata.utils.ts    # Helper functions
└── assets/
    ├── nft-template.png         # Base image template
    └── fonts/                   # Custom fonts for text overlay
        └── academic-font.ttf
```

## 🔧 **Core Services**

### 1. **Pinata Service** (`src/services/pinata.service.ts`)

```typescript
import pinataSDK from "pinata-sdk";
import fs from "fs/promises";

export class PinataService {
  private pinata: any;

  constructor() {
    this.pinata = new pinataSDK(
      process.env.PINATA_API_KEY!,
      process.env.PINATA_SECRET_API_KEY!
    );
  }

  async uploadImage(imagePath: string, filename: string): Promise<string> {
    // Upload image to IPFS via Pinata
    // Returns IPFS hash
  }

  async uploadMetadata(metadata: any, filename: string): Promise<string> {
    // Upload JSON metadata to IPFS via Pinata
    // Returns IPFS hash
  }

  async testConnection(): Promise<boolean> {
    // Test Pinata API connection
  }
}
```

### 2. **Image Generator Service** (`src/services/image-generator.service.ts`)

```typescript
import { Canvas, createCanvas, loadImage, registerFont } from "canvas";
import fs from "fs/promises";
import path from "path";

export interface ImageData {
  doci: string;
  ownerName: string;
  title: string;
  publicationDate: string;
}

export class ImageGeneratorService {
  private templatePath: string;
  private outputDir: string;

  constructor() {
    this.templatePath = process.env.IMAGE_TEMPLATE_PATH!;
    this.outputDir = process.env.TEMP_IMAGE_DIR || "./temp/images";
  }

  async generateNFTImage(data: ImageData, mint: string): Promise<string> {
    // Load base template
    // Draw DOCI and owner name with proper typography
    // Handle text sizing and positioning
    // Save to temp directory
    // Return file path
  }

  private adjustFontSize(text: string, maxWidth: number): number {
    // Calculate optimal font size for text to fit
  }

  private wrapText(text: string, maxWidth: number): string[] {
    // Handle text wrapping for long content
  }

  async ensureOutputDir(): Promise<void> {
    // Create temp directory if it doesn't exist
  }
}
```

### 3. **Updated NFT Metadata Service** (`src/services/nft-metadata.service.ts`)

```typescript
import fs from "fs/promises";
import path from "path";
import { MetabossService } from "./metaboss.service";
import { PinataService } from "./pinata.service";
import { ImageGeneratorService, ImageData } from "./image-generator.service";

export interface DOCINFTData {
  mint: string;
  doci: string;
  title: string;
  description: string;
  ipfs_hash: string;
  author: string;
  reviewers: string[];
  publication_date: number;
  authors_share: number;
  platform_share: number;
  reviewers_share: number;
}

export class NFTMetadataService {
  private metabossService: MetabossService;
  private pinataService: PinataService;
  private imageGenerator: ImageGeneratorService;

  constructor() {
    this.metabossService = new MetabossService();
    this.pinataService = new PinataService();
    this.imageGenerator = new ImageGeneratorService();
  }

  async generateMetadata(
    data: DOCINFTData,
    imageIpfsHash: string
  ): Promise<any> {
    return {
      name: `DOCI: ${data.title}`,
      symbol: "DOCI",
      description: data.description,
      image: `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`,
      external_url: `https://fronsciers.com/manuscript/${data.doci}`,
      animation_url: "",
      properties: {
        files: [
          {
            uri: `https://ipfs.io/ipfs/${data.ipfs_hash}`,
            type: "application/pdf",
          },
          {
            uri: `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`,
            type: "image/png",
          },
        ],
        category: "document",
      },
      attributes: [
        {
          trait_type: "DOCI",
          value: data.doci,
        },
        {
          trait_type: "Author",
          value: data.author,
        },
        {
          trait_type: "Publication Date",
          value: new Date(data.publication_date * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          trait_type: "Reviewers Count",
          value: data.reviewers.length,
        },
        {
          trait_type: "Authors Royalty Share",
          value: `${data.authors_share / 100}%`,
        },
        {
          trait_type: "Platform Share",
          value: `${data.platform_share / 100}%`,
        },
        {
          trait_type: "Reviewers Share",
          value: `${data.reviewers_share / 100}%`,
        },
        {
          trait_type: "Category",
          value: "Academic Manuscript",
        },
        {
          trait_type: "Platform",
          value: "Fronsciers",
        },
      ],
      collection: {
        name: "Fronsciers Published Manuscripts",
        family: "DOCI",
      },
    };
  }

  async createNFTMetadata(data: DOCINFTData): Promise<{
    success: boolean;
    imageIpfsHash?: string;
    metadataIpfsHash?: string;
    error?: string;
  }> {
    try {
      console.log(`🎯 Processing NFT metadata for DOCI: ${data.doci}`);

      // 1. Generate dynamic image
      const imageData: ImageData = {
        doci: data.doci,
        ownerName: data.author,
        title: data.title,
        publicationDate: new Date(data.publication_date * 1000)
          .toISOString()
          .split("T")[0],
      };

      const imagePath = await this.imageGenerator.generateNFTImage(
        imageData,
        data.mint
      );
      console.log(`🖼️ Generated NFT image: ${imagePath}`);

      // 2. Upload image to Pinata
      const imageIpfsHash = await this.pinataService.uploadImage(
        imagePath,
        `${data.mint}-nft-image.png`
      );
      console.log(`📤 Image uploaded to IPFS: ${imageIpfsHash}`);

      // 3. Generate metadata with image IPFS URL
      const metadata = await this.generateMetadata(data, imageIpfsHash);

      // 4. Upload metadata to Pinata
      const metadataIpfsHash = await this.pinataService.uploadMetadata(
        metadata,
        `${data.mint}-metadata.json`
      );
      console.log(`📄 Metadata uploaded to IPFS: ${metadataIpfsHash}`);

      // 5. Create NFT metadata account using metaboss
      // Note: We'll need to modify metaboss service to use IPFS URL instead of local file
      const success = await this.metabossService.createMetadataFromIPFS(
        data.mint,
        `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`
      );

      if (success) {
        console.log(`🎉 Successfully processed NFT: ${data.mint}`);
        console.log(
          `🔗 View on Solana Explorer: https://explorer.solana.com/address/${data.mint}`
        );

        // Clean up temp image file
        await fs.unlink(imagePath);

        return { success: true, imageIpfsHash, metadataIpfsHash };
      } else {
        return { success: false, error: "Failed to create metadata account" };
      }
    } catch (error) {
      console.error(`❌ Error processing NFT metadata: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
```

## 🛣️ **REST API Routes** (`src/routes/nft-metadata.ts`)

```typescript
import { Hono } from "hono";
import { NFTMetadataService } from "../services/nft-metadata.service";
import { MetabossService } from "../services/metaboss.service";

const app = new Hono();
const nftMetadataService = new NFTMetadataService();
const metabossService = new MetabossService();

// Create NFT metadata
app.post("/create", async (c) => {
  try {
    const data = await c.req.json();

    // Validate required fields
    const required = [
      "mint",
      "doci",
      "title",
      "description",
      "ipfs_hash",
      "author",
    ];
    for (const field of required) {
      if (!data[field]) {
        return c.json({ error: `Missing required field: ${field}` }, 400);
      }
    }

    const result = await nftMetadataService.createNFTMetadata(data);

    if (result.success) {
      return c.json({
        success: true,
        mint: data.mint,
        doci: data.doci,
        imageIpfsHash: result.imageIpfsHash,
        metadataIpfsHash: result.metadataIpfsHash,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        500
      );
    }
  } catch (error) {
    console.error("❌ Error in NFT metadata creation:", error);
    return c.json(
      {
        error: "Internal server error",
      },
      500
    );
  }
});

// Get NFT metadata
app.get("/:mint", async (c) => {
  try {
    const mint = c.req.param("mint");

    const metadata = await metabossService.getMetadata(mint);

    if (metadata) {
      return c.json(metadata);
    } else {
      return c.json({ error: "Metadata not found" }, 404);
    }
  } catch (error) {
    console.error("❌ Error fetching NFT metadata:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update NFT metadata
app.put("/:mint", async (c) => {
  try {
    const mint = c.req.param("mint");
    const data = await c.req.json();

    // Generate new metadata
    const metadata = nftMetadataService.generateMetadata(data);

    // Save to file
    const metadataPath = await nftMetadataService.saveMetadataFile(
      mint,
      metadata
    );

    // Update using metaboss
    const success = await metabossService.updateMetadata(mint, metadataPath);

    if (success) {
      return c.json({ success: true, mint, metadataPath });
    } else {
      return c.json(
        { success: false, error: "Failed to update metadata" },
        500
      );
    }
  } catch (error) {
    console.error("❌ Error updating NFT metadata:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "nft-metadata",
    timestamp: new Date().toISOString(),
  });
});

export default app;
```

## 🔧 **Integration with Your Hono App**

### 1. **Add to Main App** (`src/index.ts`)

```typescript
import { Hono } from "hono";
import nftMetadataRoutes from "./routes/nft-metadata";
import { SolanaEventListener } from "./services/solana-event.service";

const app = new Hono();

// Add NFT metadata routes
app.route("/api/nft-metadata", nftMetadataRoutes);

// Start event listener (optional - can be separate service)
if (process.env.NODE_ENV === "production") {
  const eventListener = new SolanaEventListener();
  eventListener.startListening().catch(console.error);
}

export default app;
```

### 2. **Add TypeScript Types** (`src/types/nft.types.ts`)

```typitten
export interface DOCINFTMinted {
  mint: string;
  doci: string;
  title: string;
  description: string;
  ipfs_hash: string;
  author: string;
  reviewers: string[];
  publication_date: number;
  authors_share: number;
  platform_share: number;
  reviewers_share: number;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  uri: string;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
  };
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection: {
    name: string;
    family: string;
  };
}

export interface NFTCreationResult {
  success: boolean;
  mint?: string;
  metadataPath?: string;
  error?: string;
}
```

## 📊 **Database Integration (Optional)**

Add NFT tracking to your database:

```typescript
// Example Prisma schema
model NFT {
  id          String   @id @default(cuid())
  mint        String   @unique
  doci        String   @unique
  manuscriptId String
  authorId    String
  title       String
  description String
  ipfsHash    String
  imageIpfsHash String? // Dynamic image IPFS hash
  metadataIpfsHash String? // Metadata JSON IPFS hash
  metadataAccount String?
  status      NFTStatus @default(PENDING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  manuscript  Manuscript @relation(fields: [manuscriptId], references: [id])
  author      User       @relation(fields: [authorId], references: [id])
}

enum NFTStatus {
  PENDING
  IMAGE_GENERATED
  UPLOADED_TO_IPFS
  METADATA_CREATED
  FAILED
}
```

## 🚀 **Usage Examples**

### 1. **Manual NFT Creation with Dynamic Image**

```bash
curl -X POST http://localhost:3000/api/nft-metadata/create \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "doci": "10.fronsciers/manuscript.2024.0001",
    "title": "Revolutionary Blockchain Research",
    "description": "A comprehensive study on decentralized academic publishing",
    "ipfs_hash": "QmExampleHash123",
    "author": "7igCaycjNjoRSSM5bCvXdEvA7LeMu6u9Db3KyvGrLuF7",
    "reviewers": ["reviewer1", "reviewer2", "reviewer3"],
    "publication_date": 1640995200,
    "authors_share": 5000,
    "platform_share": 2000,
    "reviewers_share": 3000
  }'
```

**Response:**

```json
{
  "success": true,
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "doci": "10.fronsciers/manuscript.2024.0001",
  "imageIpfsHash": "QmImageHash123",
  "metadataIpfsHash": "QmMetadataHash456"
}
```

### 2. **Frontend Integration**

```typescript
// In your frontend
const createNFTMetadata = async (nftData: DOCINFTData) => {
  const response = await fetch("/api/nft-metadata/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nftData),
  });

  return response.json();
};
```

## 🔐 **Security Considerations**

1. **API Authentication**: Add auth middleware to protect metadata creation endpoints
2. **Rate Limiting**: Prevent abuse of metadata creation
3. **Input Validation**: Validate all input data thoroughly
4. **Keypair Security**: Store Solana keypair securely (use environment variables or secret management)

## 📋 **Deployment Checklist**

- [ ] Install metaboss CLI on server
- [ ] Set up Pinata account and API keys
- [ ] Configure base NFT image template
- [ ] Install image generation dependencies (canvas, sharp)
- [ ] Set environment variables
- [ ] Configure Solana keypair
- [ ] Test image generation locally
- [ ] Test Pinata uploads
- [ ] Test metadata creation on devnet
- [ ] Set up process manager (PM2) for event listener
- [ ] Configure monitoring and logging
- [ ] Test API endpoints
- [ ] Deploy to production

## 🔧 **Monitoring & Logging**

Add structured logging:

```typescript
import { logger } from "./utils/logger";

// In your services
logger.info("NFT metadata created", {
  mint,
  doci,
  author,
  timestamp: new Date().toISOString(),
});
```

## 🎨 **Image Template Design Guidelines**

### **Base Template Requirements**

- **Dimensions**: 512x512px (standard NFT size)
- **Format**: PNG with transparency support
- **Design Elements**:
  - Fronsciers logo/branding
  - Academic color scheme (blues, grays, whites)
  - Space for DOCI text overlay
  - Space for owner name
  - Professional typography areas

### **Text Overlay Specifications**

- **DOCI Position**: Prominent, centered or upper section
- **Owner Name**: Lower section, smaller but readable
- **Font**: Professional, academic-style font
- **Text Color**: High contrast for readability
- **Fallback**: Ellipsis for very long text

### **Dynamic Sizing Logic**

```
if (doci.length > 30) {
  fontSize = 18px;
} else if (doci.length > 20) {
  fontSize = 22px;
} else {
  fontSize = 26px;
}
```

---

**✅ This enhanced integration guide now includes dynamic NFT image generation and reliable IPFS storage via Pinata for the Fronsciers academic publishing platform!**
