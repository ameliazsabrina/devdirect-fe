#!/usr/bin/env node

const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = "28VkA76EcTTN746SxZyYT8NTte9gofeBQ2L4N8hfYPgd";
const METADATA_DIR = "./metadata";

class NFTMetadataManager {
  constructor() {
    this.connection = new Connection(RPC_URL);
    this.programId = new PublicKey(PROGRAM_ID);
  }

  async ensureMetadataDir() {
    try {
      await fs.access(METADATA_DIR);
    } catch {
      await fs.mkdir(METADATA_DIR, { recursive: true });
    }
  }

  generateMetadata(eventData) {
    const {
      mint,
      doci,
      title,
      description,
      ipfs_hash,
      author,
      reviewers,
      publication_date,
      authors_share,
      platform_share,
      reviewers_share,
    } = eventData;

    return {
      name: `DOCI: ${title}`,
      symbol: "DOCI",
      description: description,
      image: `https://fronsciers.com/api/manuscript/${doci}/thumbnail.png`,
      external_url: `https://fronsciers.com/manuscript/${doci}`,
      properties: {
        files: [
          {
            uri: `https://ipfs.io/ipfs/${ipfs_hash}`,
            type: "application/pdf",
          },
        ],
        category: "document",
      },
      attributes: [
        {
          trait_type: "DOCI",
          value: doci,
        },
        {
          trait_type: "Author",
          value: author,
        },
        {
          trait_type: "Publication Date",
          value: new Date(publication_date * 1000).toISOString().split("T")[0],
        },
        {
          trait_type: "Reviewers Count",
          value: reviewers.length,
        },
        {
          trait_type: "Authors Royalty Share",
          value: `${authors_share / 100}%`,
        },
        {
          trait_type: "Platform Share",
          value: `${platform_share / 100}%`,
        },
        {
          trait_type: "Reviewers Share",
          value: `${reviewers_share / 100}%`,
        },
        {
          trait_type: "Category",
          value: "Academic Manuscript",
        },
      ],
      collection: {
        name: "Fronsciers Published Manuscripts",
        family: "DOCI",
      },
    };
  }

  async saveMetadata(mint, metadata) {
    const filename = `${mint}.json`;
    const filepath = path.join(METADATA_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    console.log(`📄 Metadata saved: ${filepath}`);

    return filepath;
  }

  async createNFTMetadata(mint, metadataPath) {
    try {
      console.log(`🚀 Creating NFT metadata for mint: ${mint}`);

      const command = `metaboss create metadata -a ${mint} -m ${metadataPath}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.error(`⚠️  Warning: ${stderr}`);
      }

      console.log(`✅ NFT metadata created successfully!`);
      console.log(`📝 Output: ${stdout}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to create NFT metadata: ${error.message}`);
      return false;
    }
  }

  async processNFTMint(eventData) {
    console.log(`\n🎯 Processing NFT mint for DOCI: ${eventData.doci}`);

    try {
      const metadata = this.generateMetadata(eventData);

      const metadataPath = await this.saveMetadata(eventData.mint, metadata);

      const success = await this.createNFTMetadata(
        eventData.mint,
        metadataPath
      );

      if (success) {
        console.log(`🎉 Successfully processed NFT: ${eventData.mint}`);
        console.log(
          `🔗 View on Solana Explorer: https://explorer.solana.com/address/${eventData.mint}`
        );
      }

      return success;
    } catch (error) {
      console.error(`❌ Error processing NFT mint: ${error.message}`);
      return false;
    }
  }

  async startEventListener() {
    console.log(`👂 Listening for NFT mint events on program: ${PROGRAM_ID}`);

    this.connection.onLogs(
      this.programId,
      (logs, context) => {
        if (logs.logs.some((log) => log.includes("DOCINFTMinted"))) {
          console.log("🔔 NFT mint event detected!");
        }
      },
      "confirmed"
    );
  }
}

async function createMetadataForMint(mintAddress, eventData) {
  const manager = new NFTMetadataManager();
  await manager.ensureMetadataDir();

  const success = await manager.processNFTMint({
    mint: mintAddress,
    ...eventData,
  });

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📚 Fronsciers NFT Metadata Manager

Usage:
  node nft-metadata.js <mint-address> [options]

Examples:
  # Create metadata for a specific mint
  node nft-metadata.js 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

  # Start event listener
  node nft-metadata.js --listen

Requirements:
  - metaboss CLI installed: cargo install metaboss
  - Solana CLI configured
  - Environment variables: SOLANA_RPC_URL
    `);
    process.exit(1);
  }

  if (args[0] === "--listen") {
    const manager = new NFTMetadataManager();
    manager.startEventListener();
  } else {
    const mintAddress = args[0];

    const exampleEventData = {
      doci: "10.fronsciers/manuscript.2024.0001",
      title: "Revolutionary Blockchain Research",
      description: "A comprehensive study on decentralized academic publishing",
      ipfs_hash: "QmExampleHash123",
      author: "7igCaycjNjoRSSM5bCvXdEvA7LeMu6u9Db3KyvGrLuF7",
      reviewers: ["BQf13DKM", "EKekPxYQ", "3sT1zTPu"],
      publication_date: Math.floor(Date.now() / 1000),
      authors_share: 5000,
      platform_share: 2000,
      reviewers_share: 3000,
    };

    createMetadataForMint(mintAddress, exampleEventData);
  }
}

module.exports = { NFTMetadataManager };
