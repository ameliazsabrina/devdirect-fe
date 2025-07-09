# NFT Frontend Integration Guide

## Overview

This guide explains how to integrate the NFT metadata backend functionality with your frontend application. The backend provides complete NFT creation, management, and verification capabilities with Pinata IPFS storage and Solana blockchain integration.

## Backend API Endpoints

### Base URL

```
http://localhost:5001/api/nft-metadata
```

### Available Endpoints

#### 1. Health Check

```http
GET /api/nft-metadata/health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "nft-metadata",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "ipfs": true,
    "metaboss": true,
    "imageGenerator": true
  },
  "dependencies": {
    "pinata": true,
    "metaboss": true,
    "imageGeneration": true
  }
}
```

#### 2. Create NFT Metadata

```http
POST /api/nft-metadata/create
```

**Request Body:**

```json
{
  "mint": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "doci": "10.fronsciers/manuscript.2024.0001",
  "title": "Revolutionary Blockchain Research in Academic Publishing",
  "description": "This manuscript explores the intersection of blockchain technology and academic publishing.",
  "ipfs_hash": "QmExampleHashForOriginalPDF123456789",
  "author": "Dr. Jane Smith",
  "reviewers": ["Dr. John Doe", "Prof. Sarah Wilson"],
  "authors_share": 5000,
  "platform_share": 2000,
  "reviewers_share": 3000,
  "publication_date": 1705312200
}
```

**Response:**

```json
{
  "success": true,
  "mint": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "doci": "10.fronsciers/manuscript.2024.0001",
  "imageIpfsHash": "QmNewImageHash123...",
  "metadataIpfsHash": "QmNewMetadataHash456...",
  "explorerUrl": "https://explorer.solana.com/address/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?cluster=devnet"
}
```

#### 3. Get NFT Metadata

```http
GET /api/nft-metadata/{mint}
```

**Response:**

```json
{
  "success": true,
  "mint": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "metadata": {
    "name": "DOCI: 10.fronsciers/manuscript.2024.0001",
    "symbol": "FRONSCIERS",
    "description": "Academic manuscript published on Fronsciers platform",
    "image": "https://gateway.pinata.cloud/ipfs/QmImageHash...",
    "external_url": "https://fronsciers.com/manuscript/10.fronsciers/manuscript.2024.0001",
    "attributes": [...]
  },
  "explorerUrl": "https://explorer.solana.com/address/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?cluster=devnet"
}
```

#### 4. Update NFT Metadata

```http
PUT /api/nft-metadata/{mint}
```

#### 5. Verify NFT Metadata

```http
GET /api/nft-metadata/{mint}/verify
```

## Frontend Integration Examples

### React/TypeScript Integration

#### 1. NFT Service Hook

```typescript
// hooks/useNFTService.ts
import { useState, useCallback } from "react";

interface NFTData {
  mint: string;
  doci: string;
  title: string;
  description: string;
  ipfs_hash: string;
  author: string;
  reviewers?: string[];
  authors_share?: number;
  platform_share?: number;
  reviewers_share?: number;
  publication_date?: number;
}

interface NFTCreationResult {
  success: boolean;
  mint?: string;
  doci?: string;
  imageIpfsHash?: string;
  metadataIpfsHash?: string;
  explorerUrl?: string;
  error?: string;
}

const API_BASE_URL = "http://localhost:5001/api/nft-metadata";

export const useNFTService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNFT = useCallback(
    async (nftData: NFTData): Promise<NFTCreationResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nftData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create NFT");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getNFTMetadata = useCallback(async (mint: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/${mint}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch NFT metadata");
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkServiceHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const result = await response.json();
      return result.status === "healthy";
    } catch (err) {
      return false;
    }
  }, []);

  return {
    createNFT,
    getNFTMetadata,
    checkServiceHealth,
    isLoading,
    error,
  };
};
```

#### 2. NFT Creation Component

```typescript
// components/NFTCreator.tsx
import React, { useState } from "react";
import { useNFTService } from "../hooks/useNFTService";

interface NFTCreatorProps {
  manuscriptData: {
    title: string;
    description: string;
    author: string;
    ipfs_hash: string;
    reviewers?: string[];
  };
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export const NFTCreator: React.FC<NFTCreatorProps> = ({
  manuscriptData,
  onSuccess,
  onError,
}) => {
  const { createNFT, isLoading, error } = useNFTService();
  const [mintAddress, setMintAddress] = useState("");

  const handleCreateNFT = async () => {
    if (!mintAddress.trim()) {
      onError?.("Please enter a valid Solana mint address");
      return;
    }

    // Generate DOCI from manuscript data
    const doci = `10.fronsciers/manuscript.${new Date().getFullYear()}.${Date.now()}`;

    const nftData = {
      mint: mintAddress,
      doci,
      title: manuscriptData.title,
      description: manuscriptData.description,
      ipfs_hash: manuscriptData.ipfs_hash,
      author: manuscriptData.author,
      reviewers: manuscriptData.reviewers || [],
      authors_share: 5000, // 50%
      platform_share: 2000, // 20%
      reviewers_share: 3000, // 30%
      publication_date: Math.floor(Date.now() / 1000),
    };

    const result = await createNFT(nftData);

    if (result.success) {
      onSuccess?.(result);
    } else {
      onError?.(result.error || "Failed to create NFT");
    }
  };

  return (
    <div className="nft-creator">
      <h3>Create NFT for Manuscript</h3>

      <div className="form-group">
        <label htmlFor="mintAddress">Solana Mint Address:</label>
        <input
          type="text"
          id="mintAddress"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          placeholder="Enter Solana mint address..."
          className="form-input"
        />
      </div>

      <div className="manuscript-info">
        <h4>Manuscript Details:</h4>
        <p>
          <strong>Title:</strong> {manuscriptData.title}
        </p>
        <p>
          <strong>Author:</strong> {manuscriptData.author}
        </p>
        <p>
          <strong>IPFS Hash:</strong> {manuscriptData.ipfs_hash}
        </p>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      <button
        onClick={handleCreateNFT}
        disabled={isLoading || !mintAddress.trim()}
        className="create-nft-button"
      >
        {isLoading ? "Creating NFT..." : "Create NFT"}
      </button>
    </div>
  );
};
```

#### 3. NFT Display Component

```typescript
// components/NFTDisplay.tsx
import React, { useEffect, useState } from "react";
import { useNFTService } from "../hooks/useNFTService";

interface NFTDisplayProps {
  mintAddress: string;
}

export const NFTDisplay: React.FC<NFTDisplayProps> = ({ mintAddress }) => {
  const { getNFTMetadata, isLoading, error } = useNFTService();
  const [nftData, setNftData] = useState<any>(null);

  useEffect(() => {
    const fetchNFTData = async () => {
      const result = await getNFTMetadata(mintAddress);
      if (result) {
        setNftData(result);
      }
    };

    if (mintAddress) {
      fetchNFTData();
    }
  }, [mintAddress, getNFTMetadata]);

  if (isLoading) {
    return <div className="loading">Loading NFT data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!nftData) {
    return <div className="no-data">No NFT data found</div>;
  }

  return (
    <div className="nft-display">
      <div className="nft-card">
        <div className="nft-image">
          <img
            src={nftData.metadata.image}
            alt={nftData.metadata.name}
            onError={(e) => {
              e.currentTarget.src = "/placeholder-nft.png";
            }}
          />
        </div>

        <div className="nft-details">
          <h3>{nftData.metadata.name}</h3>
          <p className="description">{nftData.metadata.description}</p>

          <div className="attributes">
            {nftData.metadata.attributes?.map((attr: any, index: number) => (
              <div key={index} className="attribute">
                <span className="trait-type">{attr.trait_type}:</span>
                <span className="value">{attr.value}</span>
              </div>
            ))}
          </div>

          <div className="links">
            <a
              href={nftData.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Solana Explorer
            </a>

            <a
              href={nftData.metadata.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="manuscript-link"
            >
              View Manuscript
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### 4. Integration with Publication Workflow

```typescript
// components/PublicationWorkflow.tsx
import React, { useState } from "react";
import { NFTCreator } from "./NFTCreator";
import { NFTDisplay } from "./NFTDisplay";

interface PublicationWorkflowProps {
  manuscript: {
    id: string;
    title: string;
    description: string;
    author: string;
    ipfs_hash: string;
    reviewers: string[];
    status: "draft" | "under_review" | "approved" | "published";
  };
}

export const PublicationWorkflow: React.FC<PublicationWorkflowProps> = ({
  manuscript,
}) => {
  const [nftMintAddress, setNftMintAddress] = useState<string | null>(null);
  const [showNFTCreator, setShowNFTCreator] = useState(false);

  const handleNFTCreated = (result: any) => {
    setNftMintAddress(result.mint);
    setShowNFTCreator(false);
    // You might want to save this to your database
    console.log("NFT created successfully:", result);
  };

  const handleNFTError = (error: string) => {
    console.error("NFT creation failed:", error);
    // Show user-friendly error message
  };

  return (
    <div className="publication-workflow">
      <div className="manuscript-info">
        <h2>{manuscript.title}</h2>
        <p>Status: {manuscript.status}</p>
        <p>Author: {manuscript.author}</p>
      </div>

      {manuscript.status === "approved" && !nftMintAddress && (
        <div className="nft-section">
          <h3>Create NFT</h3>
          <p>Your manuscript has been approved! You can now create an NFT.</p>

          {!showNFTCreator ? (
            <button
              onClick={() => setShowNFTCreator(true)}
              className="show-nft-creator-button"
            >
              Create NFT
            </button>
          ) : (
            <NFTCreator
              manuscriptData={manuscript}
              onSuccess={handleNFTCreated}
              onError={handleNFTError}
            />
          )}
        </div>
      )}

      {nftMintAddress && (
        <div className="nft-section">
          <h3>Your NFT</h3>
          <NFTDisplay mintAddress={nftMintAddress} />
        </div>
      )}
    </div>
  );
};
```

### CSS Styles

```css
/* styles/nft-components.css */
.nft-creator {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 16px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.manuscript-info {
  background: #f9fafb;
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
}

.create-nft-button {
  background: #3b82f6;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-nft-button:hover:not(:disabled) {
  background: #2563eb;
}

.create-nft-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.nft-card {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nft-image img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
}

.attributes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.attribute {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.trait-type {
  font-weight: 600;
  color: #6b7280;
}

.links {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.explorer-link,
.manuscript-link {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: background-color 0.2s;
}

.explorer-link:hover,
.manuscript-link:hover {
  background: #2563eb;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
  border: 1px solid #fecaca;
}

.loading {
  text-align: center;
  padding: 24px;
  color: #6b7280;
}
```

## Environment Variables

Make sure your frontend can access these environment variables or configure them appropriately:

```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SOLANA_NETWORK=devnet
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

## Error Handling

The backend provides comprehensive error responses. Common errors:

- **400 Bad Request**: Missing required fields or invalid data
- **404 Not Found**: NFT metadata not found
- **500 Internal Server Error**: Service unavailable or processing error
- **503 Service Unavailable**: Health check failed

## Testing

Use the provided test script to verify integration:

```bash
# Test the full integration
bun test-full-nft-integration.js
```

## Production Considerations

1. **Environment Configuration**: Update API URLs for production
2. **Error Logging**: Implement proper error tracking
3. **Loading States**: Provide good UX during NFT creation (can take 30-60 seconds)
4. **Validation**: Add client-side validation for mint addresses and required fields
5. **Caching**: Consider caching NFT metadata to reduce API calls
6. **Security**: Validate all user inputs and sanitize data

## Support

The NFT service integrates with:

- ✅ Pinata IPFS for metadata and image storage
- ✅ Solana blockchain for metadata accounts
- ✅ Dynamic image generation with academic branding
- ✅ Comprehensive error handling and logging
- ✅ Health monitoring and service status

For issues, check the health endpoint first to ensure all services are operational.
