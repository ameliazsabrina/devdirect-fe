import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export class MetabossService {
  private keypairPath: string;
  private rpcUrl: string;

  constructor() {
    this.keypairPath = process.env.SOLANA_KEYPAIR_PATH || "";
    this.rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

    if (!this.keypairPath) {
      console.warn(
        "⚠️ SOLANA_KEYPAIR_PATH not set. Metaboss operations will fail."
      );
    }
  }

  async initialize(): Promise<void> {
    try {
      await execAsync("metaboss --version");
      console.log("✅ Metaboss CLI found");
    } catch (error) {
      throw new Error(
        "❌ Metaboss CLI not found. Please install it with: cargo install metaboss"
      );
    }

    // Check if keypair exists
    if (this.keypairPath) {
      try {
        await fs.access(this.keypairPath);
        console.log(`✅ Solana keypair found: ${this.keypairPath}`);
      } catch (error) {
        throw new Error(
          `❌ Solana keypair not found: ${this.keypairPath}. Please ensure the keypair file exists.`
        );
      }
    }
  }

  async createMetadataFromIPFS(
    mint: string,
    metadataUri: string
  ): Promise<boolean> {
    try {
      console.log(`🚀 Creating NFT metadata for mint: ${mint}`);
      console.log(`📍 Metadata URI: ${metadataUri}`);

      if (!this.keypairPath) {
        throw new Error("Solana keypair path not configured");
      }

      const command = `metaboss create metadata --keypair ${this.keypairPath} --rpc ${this.rpcUrl} --mint ${mint} --metadata-uri ${metadataUri}`;

      console.log(`🔧 Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr && !stderr.includes("warning")) {
        console.warn(`⚠️ Metaboss stderr: ${stderr}`);
      }

      console.log(`✅ NFT metadata created successfully: ${stdout}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create NFT metadata: ${error}`);
      return false;
    }
  }

  async createMetadataFromFile(
    mint: string,
    metadataPath: string
  ): Promise<boolean> {
    try {
      console.log(`🚀 Creating NFT metadata for mint: ${mint}`);
      console.log(`📄 Metadata file: ${metadataPath}`);

      if (!this.keypairPath) {
        throw new Error("Solana keypair path not configured");
      }

      await fs.access(metadataPath);

      const command = `metaboss create metadata --keypair ${this.keypairPath} --rpc ${this.rpcUrl} --mint ${mint} --metadata ${metadataPath}`;

      console.log(`🔧 Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr && !stderr.includes("warning")) {
        console.warn(`⚠️ Metaboss stderr: ${stderr}`);
      }

      console.log(`✅ NFT metadata created successfully: ${stdout}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create NFT metadata: ${error}`);
      return false;
    }
  }

  async updateMetadata(mint: string, metadataUri: string): Promise<boolean> {
    try {
      console.log(`🔄 Updating NFT metadata for mint: ${mint}`);

      if (!this.keypairPath) {
        throw new Error("Solana keypair path not configured");
      }

      const command = `metaboss update metadata --keypair ${this.keypairPath} --rpc ${this.rpcUrl} --mint ${mint} --metadata-uri ${metadataUri}`;

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr && !stderr.includes("warning")) {
        console.warn(`⚠️ Metaboss stderr: ${stderr}`);
      }

      console.log(`✅ NFT metadata updated successfully: ${stdout}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update NFT metadata: ${error}`);
      return false;
    }
  }

  async getMetadata(mint: string): Promise<any> {
    try {
      console.log(`📖 Fetching NFT metadata for mint: ${mint}`);

      const command = `metaboss decode mint --rpc ${this.rpcUrl} --mint ${mint}`;
      const { stdout } = await execAsync(command, { timeout: 15000 });

      const metadata = JSON.parse(stdout);
      console.log(`✅ NFT metadata fetched successfully`);
      return metadata;
    } catch (error) {
      console.error(`❌ Failed to get NFT metadata: ${error}`);
      return null;
    }
  }

  async verifyMetadata(mint: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(mint);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  async checkMetabossInstallation(): Promise<boolean> {
    try {
      await execAsync("metaboss --version");
      return true;
    } catch (error) {
      return false;
    }
  }

  getExplorerUrl(mint: string): string {
    const network = this.rpcUrl.includes("devnet") ? "devnet" : "mainnet-beta";
    return `https://explorer.solana.com/address/${mint}?cluster=${network}`;
  }
}
