# NFT Metadata Integration Guide for Hono Backend

This guide shows how to integrate the Fronsciers NFT metadata management into your existing Hono backend.

## 📋 **Overview**

The NFT metadata system handles:

- ✅ Listening for `DOCINFTMinted` events from the smart contract
- ✅ Automatically generating NFT metadata JSON
- ✅ Creating metadata accounts using metaboss
- ✅ REST API endpoints for manual metadata operations
- ✅ Database tracking of NFT creation status

## 🚀 **Quick Integration**

### 1. **Install Dependencies**

```bash
# Core dependencies
npm install @solana/web3.js
npm install @coral-xyz/anchor

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

# NFT Metadata
METADATA_STORAGE_PATH=./metadata
METADATA_BASE_URL=https://your-api.com/metadata
```

## 📁 **File Structure**

```
src/
├── routes/
│   └── nft-metadata.ts          # REST API endpoints
├── services/
│   ├── metaboss.service.ts      # Metaboss CLI wrapper
│   ├── nft-metadata.service.ts  # Core NFT metadata logic
│   └── solana-event.service.ts  # Event listener
├── types/
│   └── nft.types.ts             # TypeScript interfaces
└── utils/
    └── nft-metadata.utils.ts    # Helper functions
```

## 🔧 **Core Services**

### 1. **Metaboss Service** (`src/services/metaboss.service.ts`)

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export class MetabossService {
  private keypairPath: string;
  private rpcUrl: string;
  private metadataDir: string;

  constructor() {
    this.keypairPath = process.env.SOLANA_KEYPAIR_PATH!;
    this.rpcUrl = process.env.SOLANA_RPC_URL!;
    this.metadataDir = process.env.METADATA_STORAGE_PATH || "./metadata";
  }

  async ensureMetadataDir(): Promise<void> {
    try {
      await fs.access(this.metadataDir);
    } catch {
      await fs.mkdir(this.metadataDir, { recursive: true });
    }
  }

  async createMetadata(mint: string, metadataPath: string): Promise<boolean> {
    try {
      console.log(`🚀 Creating NFT metadata for mint: ${mint}`);

      const command = `metaboss create metadata --keypair ${this.keypairPath} --rpc ${this.rpcUrl} --mint ${mint} --metadata ${metadataPath}`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.warn(`⚠️ Metaboss warning: ${stderr}`);
      }

      console.log(`✅ NFT metadata created successfully: ${stdout}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create NFT metadata: ${error}`);
      return false;
    }
  }

  async updateMetadata(mint: string, metadataPath: string): Promise<boolean> {
    try {
      const command = `metaboss update metadata --keypair ${this.keypairPath} --rpc ${this.rpcUrl} --mint ${mint} --metadata ${metadataPath}`;
      await execAsync(command);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update NFT metadata: ${error}`);
      return false;
    }
  }

  async getMetadata(mint: string): Promise<any> {
    try {
      const command = `metaboss decode mint --rpc ${this.rpcUrl} --mint ${mint}`;
      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`❌ Failed to get NFT metadata: ${error}`);
      return null;
    }
  }
}
```

### 2. **NFT Metadata Service** (`src/services/nft-metadata.service.ts`)

```typescript
import fs from "fs/promises";
import path from "path";
import { MetabossService } from "./metaboss.service";

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
  private metadataDir: string;

  constructor() {
    this.metabossService = new MetabossService();
    this.metadataDir = process.env.METADATA_STORAGE_PATH || "./metadata";
  }

  generateMetadata(data: DOCINFTData): any {
    return {
      name: `DOCI: ${data.title}`,
      symbol: "DOCI",
      description: data.description,
      image: `${process.env.METADATA_BASE_URL}/manuscript/${data.doci}/thumbnail.png`,
      external_url: `https://fronsciers.com/manuscript/${data.doci}`,
      animation_url: "",
      uri: `${process.env.METADATA_BASE_URL}/manuscript/${data.doci}/metadata.json`,
      properties: {
        files: [
          {
            uri: `https://ipfs.io/ipfs/${data.ipfs_hash}`,
            type: "application/pdf",
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

  async saveMetadataFile(mint: string, metadata: any): Promise<string> {
    await this.metabossService.ensureMetadataDir();

    const filename = `${mint}.json`;
    const filepath = path.join(this.metadataDir, filename);

    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    console.log(`📄 Metadata saved: ${filepath}`);

    return filepath;
  }

  async createNFTMetadata(
    data: DOCINFTData
  ): Promise<{ success: boolean; metadataPath?: string; error?: string }> {
    try {
      console.log(`🎯 Processing NFT metadata for DOCI: ${data.doci}`);

      const metadata = this.generateMetadata(data);

      const metadataPath = await this.saveMetadataFile(data.mint, metadata);

      const success = await this.metabossService.createMetadata(
        data.mint,
        metadataPath
      );

      if (success) {
        console.log(`🎉 Successfully processed NFT: ${data.mint}`);
        console.log(
          `🔗 View on Solana Explorer: https://explorer.solana.com/address/${data.mint}`
        );

        return { success: true, metadataPath };
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

### 3. **Solana Event Listener** (`src/services/solana-event.service.ts`)

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { NFTMetadataService, DOCINFTData } from "./nft-metadata.service";

export class SolanaEventListener {
  private connection: Connection;
  private programId: PublicKey;
  private nftMetadataService: NFTMetadataService;

  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL!);
    this.programId = new PublicKey(process.env.FRONSCIERS_PROGRAM_ID!);
    this.nftMetadataService = new NFTMetadataService();
  }

  async startListening(): Promise<void> {
    console.log(
      `👂 Listening for NFT mint events on program: ${this.programId.toString()}`
    );

    this.connection.onLogs(
      this.programId,
      async (logs, context) => {
        try {
          // Look for DOCINFTMinted event in logs
          const eventLog = logs.logs.find((log) =>
            log.includes("DOCINFTMinted")
          );

          if (eventLog) {
            console.log("🔔 NFT mint event detected!");
            console.log("📋 Event log:", eventLog);

            // Parse the event data (you'll need to implement proper event parsing)
            // For now, this is a placeholder - you'd extract actual event data
            const eventData = this.parseEventFromLogs(logs.logs);

            if (eventData) {
              await this.processNFTMintEvent(eventData);
            }
          }
        } catch (error) {
          console.error("❌ Error processing event:", error);
        }
      },
      "confirmed"
    );
  }

  private parseEventFromLogs(logs: string[]): DOCINFTData | null {
    // TODO: Implement proper event parsing
    // This is a placeholder - you'd need to parse the actual event data from logs
    // Consider using Anchor's event parsing utilities

    console.log("⚠️ Event parsing not yet implemented - using mock data");
    return null;
  }

  private async processNFTMintEvent(eventData: DOCINFTData): Promise<void> {
    console.log(`🎯 Processing NFT mint event for: ${eventData.doci}`);

    const result = await this.nftMetadataService.createNFTMetadata(eventData);

    if (result.success) {
      console.log(`✅ NFT metadata created successfully for ${eventData.mint}`);

      // TODO: Update your database
      // await this.updateDatabase(eventData, result.metadataPath);

      // TODO: Send webhooks/notifications
      // await this.sendNotification(eventData);
    } else {
      console.error(`❌ Failed to create NFT metadata: ${result.error}`);
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
        metadataPath: result.metadataPath,
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

```typescript
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
  metadataAccount String?
  status      NFTStatus @default(PENDING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  manuscript  Manuscript @relation(fields: [manuscriptId], references: [id])
  author      User       @relation(fields: [authorId], references: [id])
}

enum NFTStatus {
  PENDING
  CREATED
  FAILED
}
```

## 🚀 **Usage Examples**

### 1. **Manual NFT Creation via API**

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

### 2. **Get NFT Metadata**

```bash
curl http://localhost:3000/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### 3. **Frontend Integration**

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
- [ ] Set environment variables
- [ ] Configure Solana keypair
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

---

**✅ This integration guide provides everything you need to add NFT metadata management to your existing Hono backend!**
