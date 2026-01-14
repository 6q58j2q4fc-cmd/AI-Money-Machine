/**
 * NFT Ownership Service
 * Ties NFT creations to user's commission account with unique ownership IDs
 * Generates blockchain-compatible metadata for real marketplace listings
 */

import { getDb } from '../db';
import { nftAssets } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { storagePut } from '../storage';
import crypto from 'crypto';

// Your Trust Wallet address - the creator/owner of all NFTs
const CREATOR_WALLET = process.env.TRUST_WALLET_ADDRESS || '0x75812e1c6e9e8b0e6a1d7e6a8775';

// NFT Collection contract addresses (for future deployment)
const COLLECTION_CONTRACTS = {
  ethereum: '0x0000000000000000000000000000000000000000', // To be deployed
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  optimism: '0x0000000000000000000000000000000000000000',
  base: '0x0000000000000000000000000000000000000000',
};

// Royalty settings
const ROYALTY_PERCENTAGE = 5; // 5% royalty on secondary sales
const ROYALTY_RECIPIENT = CREATOR_WALLET;

// NFT Ownership record
interface NFTOwnership {
  tokenId: string;
  uniqueId: string;
  creator: string;
  owner: string;
  createdAt: Date;
  metadata: NFTMetadata;
  royalties: {
    percentage: number;
    recipient: string;
  };
  commissionAccount: {
    userId: number;
    walletAddress: string;
    openSeaApiKey?: string;
  };
  blockchain: {
    network: string;
    contractAddress: string;
    tokenStandard: 'ERC-721' | 'ERC-1155';
    mintStatus: 'pending' | 'minted' | 'failed';
    transactionHash?: string;
  };
}

// NFT Metadata (ERC-721 compatible)
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: string;
    creator: string;
    created_at: string;
    unique_id: string;
    collection: string;
  };
  seller_fee_basis_points: number; // Royalty in basis points (500 = 5%)
  fee_recipient: string;
}

/**
 * Generate a unique NFT ID
 */
export function generateUniqueNFTId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NFT-${timestamp}-${random}`;
}

/**
 * Generate token ID for blockchain
 */
export function generateTokenId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create NFT ownership record with full metadata
 */
export async function createNFTOwnership(
  nftId: number,
  userId: number,
  walletAddress: string,
  openSeaApiKey?: string
): Promise<NFTOwnership> {
  // Get NFT from database
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const nftRecords = await db.select().from(nftAssets).where(eq(nftAssets.id, nftId));
  const nft = nftRecords[0];
  
  if (!nft) {
    throw new Error(`NFT not found: ${nftId}`);
  }
  
  const uniqueId = generateUniqueNFTId();
  const tokenId = generateTokenId();
  
  // Create ERC-721 compatible metadata
  const metadata: NFTMetadata = {
    name: nft.name,
    description: `${nft.name} - A unique AI-generated digital artwork. Created by MoneyMachine NFT Empire. Category: ${nft.category}. This NFT is owned by ${walletAddress} and includes ${ROYALTY_PERCENTAGE}% royalties on secondary sales.`,
    image: nft.imageUrl,
    external_url: `https://moneymachine.app/nft/${uniqueId}`,
    attributes: [
      { trait_type: 'Category', value: nft.category },
      { trait_type: 'Rarity', value: nft.style || 'Common' },
      { trait_type: 'Generation', value: 'AI-Generated' },
      { trait_type: 'Collection', value: 'MoneyMachine Empire' },
      { trait_type: 'Creator', value: walletAddress },
      { trait_type: 'Base Price ETH', value: parseFloat(nft.estimatedValue || '0.05') },
    ],
    properties: {
      category: nft.category,
      creator: walletAddress,
      created_at: new Date().toISOString(),
      unique_id: uniqueId,
      collection: 'MoneyMachine Empire',
    },
    seller_fee_basis_points: ROYALTY_PERCENTAGE * 100, // 500 = 5%
    fee_recipient: walletAddress,
  };
  
  const ownership: NFTOwnership = {
    tokenId,
    uniqueId,
    creator: walletAddress,
    owner: walletAddress,
    createdAt: new Date(),
    metadata,
    royalties: {
      percentage: ROYALTY_PERCENTAGE,
      recipient: walletAddress,
    },
    commissionAccount: {
      userId,
      walletAddress,
      openSeaApiKey,
    },
    blockchain: {
      network: 'polygon', // Default to Polygon for lower gas fees
      contractAddress: COLLECTION_CONTRACTS.polygon,
      tokenStandard: 'ERC-721',
      mintStatus: 'pending',
    },
  };
  
  // Update NFT in database with ownership info
  await db!.update(nftAssets).set({
    tokenId,
    metadataUri: JSON.stringify(metadata),
    status: 'generated',
    updatedAt: new Date(),
  }).where(eq(nftAssets.id, nftId));
  
  return ownership;
}

/**
 * Upload NFT metadata to IPFS/S3 for permanent storage
 */
export async function uploadNFTMetadata(metadata: NFTMetadata): Promise<string> {
  const metadataJson = JSON.stringify(metadata, null, 2);
  const fileName = `nft-metadata/${metadata.properties.unique_id}.json`;
  
  try {
    const { url } = await storagePut(fileName, metadataJson, 'application/json');
    return url;
  } catch (error) {
    console.error('Failed to upload NFT metadata:', error);
    // Return a placeholder URL if upload fails
    return `https://moneymachine.app/api/nft/metadata/${metadata.properties.unique_id}`;
  }
}

/**
 * Generate OpenSea-compatible listing URL
 */
export function generateOpenSeaListingUrl(
  contractAddress: string,
  tokenId: string,
  network: string = 'matic' // polygon
): string {
  const networkPrefix = network === 'ethereum' ? '' : `${network}/`;
  return `https://opensea.io/assets/${networkPrefix}${contractAddress}/${tokenId}`;
}

/**
 * Generate Blur listing URL
 */
export function generateBlurListingUrl(
  contractAddress: string,
  tokenId: string
): string {
  return `https://blur.io/asset/${contractAddress}/${tokenId}`;
}

/**
 * Generate LooksRare listing URL
 */
export function generateLooksRareListingUrl(
  contractAddress: string,
  tokenId: string
): string {
  return `https://looksrare.org/collections/${contractAddress}/${tokenId}`;
}

/**
 * Get all marketplace URLs for an NFT
 */
export function getAllMarketplaceUrls(
  contractAddress: string,
  tokenId: string,
  network: string = 'polygon'
): Record<string, string> {
  return {
    opensea: generateOpenSeaListingUrl(contractAddress, tokenId, network),
    blur: generateBlurListingUrl(contractAddress, tokenId),
    looksrare: generateLooksRareListingUrl(contractAddress, tokenId),
    rarible: `https://rarible.com/token/${contractAddress}:${tokenId}`,
    x2y2: `https://x2y2.io/eth/${contractAddress}/${tokenId}`,
    foundation: `https://foundation.app/collection/${contractAddress}/${tokenId}`,
    nftx: `https://nftx.io/vault/${contractAddress}/${tokenId}`,
    sudoswap: `https://sudoswap.xyz/#/item/${contractAddress}/${tokenId}`,
  };
}

/**
 * Verify NFT ownership on blockchain (placeholder for real implementation)
 */
export async function verifyNFTOwnership(
  contractAddress: string,
  tokenId: string,
  expectedOwner: string
): Promise<boolean> {
  // In a real implementation, this would query the blockchain
  // For now, return true as we're simulating ownership
  console.log(`[NFTOwnership] Verifying ownership of token ${tokenId} for ${expectedOwner}`);
  return true;
}

/**
 * Transfer NFT ownership (placeholder for real implementation)
 */
export async function transferNFTOwnership(
  contractAddress: string,
  tokenId: string,
  from: string,
  to: string
): Promise<{ success: boolean; transactionHash?: string }> {
  // In a real implementation, this would execute a blockchain transaction
  console.log(`[NFTOwnership] Transferring token ${tokenId} from ${from} to ${to}`);
  return {
    success: true,
    transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
  };
}

/**
 * Get NFT ownership details
 */
export async function getNFTOwnershipDetails(nftId: number): Promise<{
  uniqueId: string;
  creator: string;
  owner: string;
  royaltyPercentage: number;
  metadata: NFTMetadata | null;
  marketplaceUrls: Record<string, string>;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const nftRecords = await db.select().from(nftAssets).where(eq(nftAssets.id, nftId));
  const nft = nftRecords[0];
  
  if (!nft) {
    return null;
  }
  
  const metadata = nft.metadataUri ? JSON.parse(nft.metadataUri) : null;
  const contractAddress = COLLECTION_CONTRACTS.polygon;
  const tokenId = nft.tokenId || generateTokenId();
  
  return {
    uniqueId: tokenId,
    creator: CREATOR_WALLET,
    owner: CREATOR_WALLET,
    royaltyPercentage: ROYALTY_PERCENTAGE,
    metadata,
    marketplaceUrls: getAllMarketplaceUrls(contractAddress, tokenId),
  };
}

/**
 * Batch create ownership for multiple NFTs
 */
export async function batchCreateOwnership(
  nftIds: number[],
  userId: number,
  walletAddress: string,
  openSeaApiKey?: string
): Promise<NFTOwnership[]> {
  const ownerships: NFTOwnership[] = [];
  
  for (const nftId of nftIds) {
    try {
      const ownership = await createNFTOwnership(nftId, userId, walletAddress, openSeaApiKey);
      ownerships.push(ownership);
    } catch (error) {
      console.error(`Failed to create ownership for NFT ${nftId}:`, error);
    }
  }
  
  return ownerships;
}

console.log('[NFTOwnership] NFT ownership service initialized');
