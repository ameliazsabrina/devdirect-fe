import {
  DOCINFTData,
  ImageData,
  NFTMetadata,
  NFTCreationResult,
} from "../types/nft.types";
import { IPFSService } from "./ipfs/index";
import { ImageGeneratorService } from "./image-generator.service";
import { MetabossService } from "./metaboss.service";
import fs from "fs/promises";

export class NFTMetadataService {
  private ipfsService: IPFSService;
  private imageGenerator: ImageGeneratorService;
  private metabossService: MetabossService;

  constructor() {
    this.ipfsService = new IPFSService();
    this.imageGenerator = new ImageGeneratorService();
    this.metabossService = new MetabossService();
  }

  async initialize(): Promise<void> {
    console.log("🔧 Initializing NFT Metadata Service...");

    try {
      await Promise.all([
        this.ipfsService.initialize(),
        this.imageGenerator.initialize(),
        this.metabossService.initialize(),
      ]);

      console.log("✅ NFT Metadata Service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize NFT Metadata Service:", error);
      throw error;
    }
  }

  generateMetadata(data: DOCINFTData, imageIpfsHash: string): NFTMetadata {
    return {
      name: `DOCI: ${data.title}`,
      symbol: "DOCI",
      description: data.description,
      image: `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`,
      external_url: `https://fronsciers.com/manuscript/${data.doci}`,
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

  async createNFTMetadata(data: DOCINFTData): Promise<NFTCreationResult> {
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

      console.log("🖼️ Generating NFT image...");
      const imagePath = await this.imageGenerator.generateNFTImage(
        imageData,
        data.mint
      );

      // 2. Upload image to IPFS via Pinata
      console.log("📤 Uploading image to IPFS...");
      const imageBuffer = await fs.readFile(imagePath);
      const imageIpfsHash = await this.ipfsService.addFile(
        imageBuffer,
        `${data.mint}-nft-image.png`
      );
      console.log(`✅ Image uploaded to IPFS: ${imageIpfsHash}`);

      // 3. Generate metadata with image IPFS URL
      console.log("📄 Generating metadata JSON...");
      const metadata = this.generateMetadata(data, imageIpfsHash);

      // 4. Upload metadata to IPFS via Pinata
      console.log("📤 Uploading metadata to IPFS...");
      const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
      const metadataIpfsHash = await this.ipfsService.addFile(
        metadataBuffer,
        `${data.mint}-metadata.json`
      );
      console.log(`✅ Metadata uploaded to IPFS: ${metadataIpfsHash}`);

      // 5. Create NFT metadata account using metaboss
      console.log("🔗 Creating Solana metadata account...");
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;
      const success = await this.metabossService.createMetadataFromIPFS(
        data.mint,
        metadataUri
      );

      if (success) {
        console.log(`🎉 Successfully processed NFT: ${data.mint}`);
        console.log(
          `🔗 View on Solana Explorer: ${this.metabossService.getExplorerUrl(
            data.mint
          )}`
        );

        // Clean up temp image file
        await this.imageGenerator.cleanup(imagePath);

        return {
          success: true,
          mint: data.mint,
          imageIpfsHash,
          metadataIpfsHash,
        };
      } else {
        // Clean up temp file even if metadata creation failed
        await this.imageGenerator.cleanup(imagePath);

        return {
          success: false,
          error: "Failed to create Solana metadata account",
        };
      }
    } catch (error) {
      console.error(`❌ Error processing NFT metadata: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateNFTMetadata(data: DOCINFTData): Promise<NFTCreationResult> {
    try {
      console.log(`🔄 Updating NFT metadata for DOCI: ${data.doci}`);

      // Generate new image and metadata
      const result = await this.createNFTImageAndMetadata(data);

      if (!result.success) {
        return result;
      }

      // Update using metaboss
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${result.metadataIpfsHash}`;
      const success = await this.metabossService.updateMetadata(
        data.mint,
        metadataUri
      );

      if (success) {
        return {
          success: true,
          mint: data.mint,
          imageIpfsHash: result.imageIpfsHash,
          metadataIpfsHash: result.metadataIpfsHash,
        };
      } else {
        return {
          success: false,
          error: "Failed to update Solana metadata account",
        };
      }
    } catch (error) {
      console.error(`❌ Error updating NFT metadata: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createNFTImageAndMetadata(
    data: DOCINFTData
  ): Promise<NFTCreationResult> {
    try {
      // Generate image
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

      // Upload image to IPFS
      const imageBuffer = await fs.readFile(imagePath);
      const imageIpfsHash = await this.ipfsService.addFile(
        imageBuffer,
        `${data.mint}-nft-image.png`
      );

      // Generate and upload metadata
      const metadata = this.generateMetadata(data, imageIpfsHash);
      const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
      const metadataIpfsHash = await this.ipfsService.addFile(
        metadataBuffer,
        `${data.mint}-metadata.json`
      );

      // Clean up temp file
      await this.imageGenerator.cleanup(imagePath);

      return {
        success: true,
        imageIpfsHash,
        metadataIpfsHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getNFTMetadata(mint: string): Promise<any> {
    return this.metabossService.getMetadata(mint);
  }

  async verifyNFTMetadata(mint: string): Promise<boolean> {
    return this.metabossService.verifyMetadata(mint);
  }

  async getServiceStatus(): Promise<{
    ipfs: boolean;
    metaboss: boolean;
    imageGenerator: boolean;
  }> {
    try {
      const [metabossOk] = await Promise.all([
        this.metabossService.checkMetabossInstallation(),
      ]);

      return {
        ipfs: this.ipfsService !== null, // IPFS service exists
        metaboss: metabossOk,
        imageGenerator: true, // If we got here, it's working
      };
    } catch (error) {
      return {
        ipfs: false,
        metaboss: false,
        imageGenerator: false,
      };
    }
  }
}
