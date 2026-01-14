/**
 * Rarible API Integration
 * Syncs NFT listings with Rarible marketplace
 */

import { getDb } from "../db";
import { nftAssets, nftListings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const RARIBLE_API_BASE = "https://api.rarible.org/v0.1";

interface RaribleItem {
  id: string;
  blockchain: string;
  collection: string;
  contract: string;
  tokenId: string;
  creators: Array<{ account: string; value: number }>;
  owners: string[];
  royalties: Array<{ account: string; value: number }>;
  lazySupply: string;
  pending: any[];
  mintedAt: string;
  lastUpdatedAt: string;
  supply: string;
  meta?: {
    name: string;
    description?: string;
    attributes?: Array<{ key: string; value: string }>;
    content?: Array<{ url: string; representation: string; mimeType: string }>;
  };
  deleted: boolean;
  auctions: any[];
  totalStock: string;
  sellers: number;
}

interface RaribleOrder {
  id: string;
  fill: string;
  platform: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  makeStock: string;
  cancelled: boolean;
  createdAt: string;
  lastUpdatedAt: string;
  makePrice: string;
  makePriceUsd: string;
  maker: string;
  make: {
    type: { "@type": string; contract: string; tokenId: string };
    value: string;
  };
  take: {
    type: { "@type": string; blockchain: string };
    value: string;
  };
  salt: string;
  signature?: string;
  pending: any[];
  data: any;
}

/**
 * Get Rarible API key from environment
 */
function getRaribleApiKey(): string | null {
  return process.env.RARIBLE_API_KEY || null;
}

/**
 * Make authenticated request to Rarible API
 */
async function raribleRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getRaribleApiKey();
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  
  const response = await fetch(`${RARIBLE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Rarible API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Convert chain name to Rarible blockchain format
 */
function toRaribleBlockchain(chain: string): string {
  const chainMap: Record<string, string> = {
    ethereum: 'ETHEREUM',
    polygon: 'POLYGON',
    arbitrum: 'ARBITRUM',
    optimism: 'OPTIMISM',
    base: 'BASE',
  };
  return chainMap[chain] || 'ETHEREUM';
}

/**
 * Get NFT item from Rarible
 */
export async function getRaribleItem(blockchain: string, contractAddress: string, tokenId: string): Promise<RaribleItem | null> {
  try {
    const itemId = `${blockchain}:${contractAddress}:${tokenId}`;
    const data = await raribleRequest(`/items/${itemId}`);
    return data;
  } catch (error) {
    console.error('Failed to get Rarible item:', error);
    return null;
  }
}

/**
 * Get active sell orders for an NFT
 */
export async function getRaribleOrders(blockchain: string, contractAddress: string, tokenId: string): Promise<RaribleOrder[]> {
  try {
    const itemId = `${blockchain}:${contractAddress}:${tokenId}`;
    const data = await raribleRequest(`/orders/sell/byItem?itemId=${itemId}&status=ACTIVE`);
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get Rarible orders:', error);
    return [];
  }
}

/**
 * Sync NFT listing status from Rarible
 */
export async function syncNftFromRarible(nftId: number): Promise<{
  success: boolean;
  raribleUrl?: string;
  price?: string;
  status?: string;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    const [nft] = await db
      .select()
      .from(nftAssets)
      .where(eq(nftAssets.id, nftId))
      .limit(1);
    
    if (!nft) {
      return { success: false, error: 'NFT not found' };
    }
    
    if (!nft.contractAddress || !nft.tokenId) {
      return { success: false, error: 'NFT not minted on blockchain' };
    }
    
    const blockchain = toRaribleBlockchain(nft.chain || 'ethereum');
    
    // Get NFT details from Rarible
    const item = await getRaribleItem(blockchain, nft.contractAddress, nft.tokenId);
    
    if (!item) {
      return { success: false, error: 'NFT not found on Rarible' };
    }
    
    // Get active orders
    const orders = await getRaribleOrders(blockchain, nft.contractAddress, nft.tokenId);
    
    const raribleUrl = `https://rarible.com/token/${blockchain.toLowerCase()}/${nft.contractAddress}:${nft.tokenId}`;
    
    // Update or create listing in database
    const existingListing = await db
      .select()
      .from(nftListings)
      .where(and(
        eq(nftListings.nftAssetId, nftId),
        eq(nftListings.marketplace, 'rarible')
      ))
      .limit(1);
    
    if (orders.length > 0) {
      const activeOrder = orders[0];
      const priceEth = activeOrder.makePrice || '0';
      
      if (existingListing.length > 0) {
        await db
          .update(nftListings)
          .set({
            listPrice: priceEth,
            listingUrl: raribleUrl,
            listingId: activeOrder.id,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(nftListings.id, existingListing[0].id));
      } else {
        await db
          .insert(nftListings)
          .values({
            nftAssetId: nftId,
            userId: nft.userId,
            marketplace: 'rarible',
            listingUrl: raribleUrl,
            listingId: activeOrder.id,
            listPrice: priceEth,
            currency: 'ETH',
            status: 'active',
            listedAt: new Date(),
          });
      }
      
      return {
        success: true,
        raribleUrl,
        price: priceEth,
        status: 'active',
      };
    } else {
      if (existingListing.length > 0) {
        await db
          .update(nftListings)
          .set({
            status: 'expired',
            updatedAt: new Date(),
          })
          .where(eq(nftListings.id, existingListing[0].id));
      }
      
      return {
        success: true,
        raribleUrl,
        status: 'not_listed',
      };
    }
  } catch (error) {
    console.error('Failed to sync NFT from Rarible:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if Rarible API is configured
 */
export function isRaribleConfigured(): boolean {
  return !!getRaribleApiKey();
}

/**
 * Get Rarible API status
 */
export async function getRaribleStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  const configured = isRaribleConfigured();
  
  if (!configured) {
    return { configured: false, connected: false };
  }
  
  try {
    // Test API connection
    await raribleRequest('/collections/all?size=1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: String(error) };
  }
}
