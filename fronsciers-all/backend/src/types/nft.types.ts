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

export interface ImageData {
  doci: string;
  ownerName: string;
  title: string;
  publicationDate: string;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
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
  imageIpfsHash?: string;
  metadataIpfsHash?: string;
  error?: string;
}

export enum NFTStatus {
  PENDING = "PENDING",
  IMAGE_GENERATED = "IMAGE_GENERATED",
  UPLOADED_TO_IPFS = "UPLOADED_TO_IPFS",
  METADATA_CREATED = "METADATA_CREATED",
  FAILED = "FAILED",
}
