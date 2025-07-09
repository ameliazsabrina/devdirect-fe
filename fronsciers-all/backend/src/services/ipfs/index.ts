export class IPFSService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataJWT: string;
  private pinataGatewayKey: string;
  private pinataBaseUrl = "https://api.pinata.cloud";
  private pinataGatewayUrl = "https://gateway.pinata.cloud";
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || "";
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || "";
    this.pinataJWT = process.env.PINATA_JWT || "";
    this.pinataGatewayKey = process.env.PINATA_GATEWAY_KEY || "";

    if (!this.pinataApiKey && !this.pinataJWT && !this.pinataGatewayKey) {
      console.error("❌ Missing Pinata configuration!");
      console.error("Please create a .env file in the backend directory with:");
      console.error("PINATA_GATEWAY_KEY=your_pinata_gateway_key");
      console.error("OR");
      console.error("PINATA_JWT=your_pinata_jwt_token");
      console.error("OR");
      console.error("PINATA_API_KEY=your_pinata_api_key");
      console.error("PINATA_SECRET_KEY=your_pinata_secret_key");
      console.error("Visit https://pinata.cloud to get your credentials");
      throw new Error(
        "Missing Pinata configuration. Please set PINATA_GATEWAY_KEY, PINATA_JWT, or PINATA_API_KEY and PINATA_SECRET_KEY in your .env file"
      );
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _doInitialize() {
    if (this.isInitialized) return;

    try {
      // If we have a gateway key, we're good to go (gateway keys don't need API testing)
      if (this.pinataGatewayKey) {
        this.isInitialized = true;
        return;
      }

      // Test API authentication for JWT or API key/secret
      if (this.pinataJWT || this.pinataApiKey) {
        const headers = this.getAuthHeaders();
        const response = await fetch(
          `${this.pinataBaseUrl}/data/testAuthentication`,
          {
            method: "GET",
            headers: headers,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Pinata API authentication failed: ${response.statusText}`
          );
        }

        const result = await response.json();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize Pinata service:", error);
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.pinataJWT) {
      return {
        Authorization: `Bearer ${this.pinataJWT}`,
      };
    } else {
      return {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      };
    }
  }

  private isValidIPFSHash(hash: string): boolean {
    // IPFS hashes typically start with Qm (v0) or bafy (v1)
    // and have specific length requirements
    if (!hash || typeof hash !== "string") return false;

    // Check for CIDv0 (base58, starts with Qm)
    if (hash.startsWith("Qm") && hash.length === 46) {
      return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
    }

    // Check for CIDv1 (starts with bafy, bafk, etc.)
    if (hash.startsWith("baf") && hash.length >= 59) {
      return /^baf[a-z0-9]+$/.test(hash);
    }

    return false;
  }

  async addFile(content: Uint8Array, filename?: string): Promise<string> {
    await this.initialize();

    try {
      const formData = new FormData();

      const contentCopy = new Uint8Array(content);
      const blob = new Blob([contentCopy as any], {
        type: "application/octet-stream",
      });

      // Use provided filename or fall back to timestamp-based naming
      const fileDisplayName = filename || `file_${Date.now()}`;
      formData.append("file", blob, fileDisplayName);

      const metadata = JSON.stringify({
        name: fileDisplayName,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: "fronsciers-backend",
          originalFilename: filename || undefined,
        },
      });
      formData.append("pinataMetadata", metadata);

      const options = JSON.stringify({
        cidVersion: 1,
      });
      formData.append("pinataOptions", options);

      const headers = this.getAuthHeaders();
      // Don't set Content-Type header when using FormData - let the browser set it
      const response = await fetch(
        `${this.pinataBaseUrl}/pinning/pinFileToIPFS`,
        {
          method: "POST",
          headers: headers,
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Pinata upload error details:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          headers: Object.fromEntries(response.headers.entries()),
        });
        throw new Error(
          `Pinata upload failed: ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error("❌ Failed to add file to Pinata:", error);
      throw error;
    }
  }

  async getFile(hash: string): Promise<Uint8Array> {
    await this.initialize();

    // Validate IPFS hash format
    if (!this.isValidIPFSHash(hash)) {
      throw new Error(
        `Invalid IPFS hash format: ${hash}. Expected Qm... or bafy... format.`
      );
    }

    try {
      // Use gateway key if available (preferred method)
      if (this.pinataGatewayKey) {
        const response = await fetch(`${this.pinataGatewayUrl}/ipfs/${hash}`, {
          headers: {
            "x-pinata-gateway-token": this.pinataGatewayKey,
          },
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          console.log(
            "✅ File retrieved successfully via Pinata gateway key:",
            hash
          );
          return new Uint8Array(arrayBuffer);
        } else {
          console.warn(
            `⚠️ Pinata gateway with key failed (${response.status}): ${response.statusText}`
          );
        }
      }

      // Fallback to multiple public gateways
      const fallbackGateways = [
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`,
      ];

      for (const gatewayUrl of fallbackGateways) {
        try {
          const response = await fetch(gatewayUrl);

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            console.log(
              "✅ File retrieved successfully from fallback gateway:",
              hash
            );
            return new Uint8Array(arrayBuffer);
          } else {
            console.warn(
              `⚠️ Fallback gateway failed (${response.status}): ${gatewayUrl}`
            );
          }
        } catch (gatewayError) {
          console.warn(
            `⚠️ Fallback gateway error: ${gatewayUrl}`,
            gatewayError
          );
        }
      }

      throw new Error(`All IPFS gateways failed for hash: ${hash}`);
    } catch (error) {
      console.error("❌ Failed to get file from IPFS:", error);
      throw error;
    }
  }

  async getInfo() {
    await this.initialize();

    try {
      const headers = this.getAuthHeaders();

      // Get pinned files count and total storage
      const [dataResponse, usageResponse] = await Promise.all([
        fetch(`${this.pinataBaseUrl}/data/pinList?status=pinned&pageLimit=1`, {
          method: "GET",
          headers: headers,
        }),
        fetch(`${this.pinataBaseUrl}/data/userPinnedDataTotal`, {
          method: "GET",
          headers: headers,
        }),
      ]);

      const data = dataResponse.ok ? await dataResponse.json() : null;
      const usage = usageResponse.ok ? await usageResponse.json() : null;

      return {
        version: "Pinata IPFS Gateway",
        peerId: "pinata-gateway",
        addresses: [`${this.pinataGatewayUrl}/ipfs/`],
        connectedPeers: "N/A (Gateway)",
        initialized: this.isInitialized,
        pinnedFiles: data?.count || 0,
        totalSize: usage?.pin_size_total || 0,
        totalFiles: usage?.pin_count || 0,
      };
    } catch (error) {
      console.error("❌ Failed to get Pinata info:", error);
      return {
        version: "Pinata IPFS Gateway",
        peerId: "pinata-gateway",
        addresses: [`${this.pinataGatewayUrl}/ipfs/`],
        connectedPeers: "N/A (Gateway)",
        initialized: this.isInitialized,
        pinnedFiles: 0,
        totalSize: 0,
        totalFiles: 0,
      };
    }
  }

  async stop() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  // Additional Pinata-specific methods
  async unpinFile(hash: string): Promise<boolean> {
    await this.initialize();

    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(
        `${this.pinataBaseUrl}/pinning/unpin/${hash}`,
        {
          method: "DELETE",
          headers: headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to unpin file: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to unpin file from Pinata:", error);
      return false;
    }
  }

  async listPinnedFiles(pageLimit: number = 10, pageOffset: number = 0) {
    await this.initialize();

    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(
        `${this.pinataBaseUrl}/data/pinList?status=pinned&pageLimit=${pageLimit}&pageOffset=${pageOffset}`,
        {
          method: "GET",
          headers: headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list pinned files: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("❌ Failed to list pinned files from Pinata:", error);
      throw error;
    }
  }
}

export const ipfsService = new IPFSService();
