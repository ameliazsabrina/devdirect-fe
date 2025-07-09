import { Hono } from "hono";
import { NFTMetadataService } from "../services/nft-metadata.service";
import { DOCINFTData } from "../types/nft.types";

const app = new Hono();
const nftMetadataService = new NFTMetadataService();

nftMetadataService.initialize().catch((error) => {
  console.error("❌ Failed to initialize NFT Metadata Service:", error);
});

app.get("/health", async (c) => {
  try {
    const status = await nftMetadataService.getServiceStatus();

    const allHealthy = Object.values(status).every(Boolean);

    return c.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        service: "nft-metadata",
        timestamp: new Date().toISOString(),
        services: status,
        dependencies: {
          pinata: status.ipfs,
          metaboss: status.metaboss,
          imageGeneration: status.imageGenerator,
        },
      },
      allHealthy ? 200 : 503
    );
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        service: "nft-metadata",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

// Create NFT metadata
app.post("/create", async (c) => {
  try {
    const data: DOCINFTData = await c.req.json();

    // Validate required fields
    const required = [
      "mint",
      "doci",
      "title",
      "description",
      "ipfs_hash",
      "author",
    ];

    const missing = required.filter(
      (field) => !data[field as keyof DOCINFTData]
    );
    if (missing.length > 0) {
      return c.json(
        {
          error: `Missing required fields: ${missing.join(", ")}`,
          required: required,
        },
        400
      );
    }

    // Set defaults for optional fields
    data.reviewers = data.reviewers || [];
    data.authors_share = data.authors_share || 5000; // 50%
    data.platform_share = data.platform_share || 2000; // 20%
    data.reviewers_share = data.reviewers_share || 3000; // 30%
    data.publication_date =
      data.publication_date || Math.floor(Date.now() / 1000);

    console.log(`🎯 Creating NFT metadata for mint: ${data.mint}`);
    const result = await nftMetadataService.createNFTMetadata(data);

    if (result.success) {
      return c.json({
        success: true,
        mint: data.mint,
        doci: data.doci,
        imageIpfsHash: result.imageIpfsHash,
        metadataIpfsHash: result.metadataIpfsHash,
        explorerUrl: `https://explorer.solana.com/address/${data.mint}?cluster=devnet`,
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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get NFT metadata
app.get("/:mint", async (c) => {
  try {
    const mint = c.req.param("mint");

    if (!mint || mint.length < 32) {
      return c.json({ error: "Invalid mint address" }, 400);
    }

    console.log(`📖 Fetching NFT metadata for mint: ${mint}`);
    const metadata = await nftMetadataService.getNFTMetadata(mint);

    if (metadata) {
      return c.json({
        success: true,
        mint,
        metadata,
        explorerUrl: `https://explorer.solana.com/address/${mint}?cluster=devnet`,
      });
    } else {
      return c.json(
        {
          error: "Metadata not found",
          mint,
        },
        404
      );
    }
  } catch (error) {
    console.error("❌ Error fetching NFT metadata:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Update NFT metadata
app.put("/:mint", async (c) => {
  try {
    const mint = c.req.param("mint");
    const data: DOCINFTData = await c.req.json();

    if (!mint || mint.length < 32) {
      return c.json({ error: "Invalid mint address" }, 400);
    }

    // Ensure mint in data matches URL parameter
    data.mint = mint;

    // Validate required fields for update
    const required = ["doci", "title", "description", "ipfs_hash", "author"];
    const missing = required.filter(
      (field) => !data[field as keyof DOCINFTData]
    );
    if (missing.length > 0) {
      return c.json(
        {
          error: `Missing required fields: ${missing.join(", ")}`,
          required: required,
        },
        400
      );
    }

    console.log(`🔄 Updating NFT metadata for mint: ${mint}`);
    const result = await nftMetadataService.updateNFTMetadata(data);

    if (result.success) {
      return c.json({
        success: true,
        mint,
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
    console.error("❌ Error updating NFT metadata:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Verify NFT metadata exists
app.get("/:mint/verify", async (c) => {
  try {
    const mint = c.req.param("mint");

    if (!mint || mint.length < 32) {
      return c.json({ error: "Invalid mint address" }, 400);
    }

    console.log(`🔍 Verifying NFT metadata for mint: ${mint}`);
    const exists = await nftMetadataService.verifyNFTMetadata(mint);

    return c.json({
      mint,
      exists,
      explorerUrl: `https://explorer.solana.com/address/${mint}?cluster=devnet`,
    });
  } catch (error) {
    console.error("❌ Error verifying NFT metadata:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Generate preview image (without creating metadata)
app.post("/preview-image", async (c) => {
  try {
    const { doci, ownerName, title, publicationDate } = await c.req.json();

    if (!doci || !ownerName || !title) {
      return c.json(
        {
          error: "Missing required fields: doci, ownerName, title",
        },
        400
      );
    }

    // This would generate a preview without saving to blockchain
    // Useful for frontend preview functionality
    return c.json({
      message: "Preview image generation not yet implemented",
      data: { doci, ownerName, title, publicationDate },
    });
  } catch (error) {
    console.error("❌ Error generating preview image:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Batch operations (for future use)
app.post("/batch/create", async (c) => {
  try {
    const nfts: DOCINFTData[] = await c.req.json();

    if (!Array.isArray(nfts) || nfts.length === 0) {
      return c.json({ error: "Expected array of NFT data" }, 400);
    }

    if (nfts.length > 10) {
      return c.json({ error: "Maximum 10 NFTs per batch" }, 400);
    }

    // TODO: Implement batch processing
    return c.json({
      message: "Batch processing not yet implemented",
      count: nfts.length,
    });
  } catch (error) {
    console.error("❌ Error in batch processing:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
