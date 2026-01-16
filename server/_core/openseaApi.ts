/**
 * OpenSea API Integration
 * Syncs NFT listings with OpenSea marketplace
 */

import { getDb } from "../db";
import { nftAssets, nftListings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";

interface OpenSeaListing {
  order_hash: string;
  chain: string;
  protocol_address: string;
  price: {
    current: {
      currency: string;
      decimals: number;
      value: string;
    };
  };
  protocol_data: {
    parameters: {
      offer: Array<{
        token: string;
        identifierOrCriteria: string;
      }>;
    };
  };
}

interface OpenSeaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: string;
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  collection_offers_enabled: boolean;
  opensea_url: string;
  project_url: string;
  wiki_url: string;
  discord_url: string;
  telegram_url: string;
  twitter_username: string;
  instagram_username: string;
  contracts: Array<{
    address: string;
    chain: string;
  }>;
}

/**
 * Get OpenSea API key from environment
 */
function getOpenSeaApiKey(): string | null {
  // Check multiple possible env var names
  return process.env.OPENSEA_API_KEY || process.env.OPENSEA_API || null;
}

/**
 * Make authenticated request to OpenSea API
 */
async function openSeaRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getOpenSeaApiKey();
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  
  const response = await fetch(`${OPENSEA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenSea API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Get collection info from OpenSea
 */
export async function getCollection(collectionSlug: string): Promise<OpenSeaCollection | null> {
  try {
    const data = await openSeaRequest(`/collections/${collectionSlug}`);
    return data;
  } catch (error) {
    console.error('Failed to get OpenSea collection:', error);
    return null;
  }
}

/**
 * Get NFT details from OpenSea
 */
export async function getNftDetails(chain: string, contractAddress: string, tokenId: string): Promise<any> {
  try {
    const data = await openSeaRequest(`/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`);
    return data.nft;
  } catch (error) {
    console.error('Failed to get NFT details from OpenSea:', error);
    return null;
  }
}

/**
 * Get active listings for an NFT
 */
export async function getNftListings(chain: string, contractAddress: string, tokenId: string): Promise<OpenSeaListing[]> {
  try {
    const data = await openSeaRequest(`/orders/${chain}/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}`);
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get NFT listings from OpenSea:', error);
    return [];
  }
}

/**
 * Sync NFT listing status from OpenSea
 */
export async function syncNftFromOpenSea(nftId: number): Promise<{
  success: boolean;
  openSeaUrl?: string;
  price?: string;
  status?: string;
  error?: string;
}> {
  try {
    // Get NFT from database
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
    
    // Map chain to OpenSea chain name
    const chainMap: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'matic',
      arbitrum: 'arbitrum',
      optimism: 'optimism',
      base: 'base',
    };
    
    const openSeaChain = chainMap[nft.chain || 'ethereum'] || 'ethereum';
    
    // Get NFT details from OpenSea
    const nftDetails = await getNftDetails(openSeaChain, nft.contractAddress, nft.tokenId);
    
    if (!nftDetails) {
      return { success: false, error: 'NFT not found on OpenSea' };
    }
    
    // Get active listings
    const listings = await getNftListings(openSeaChain, nft.contractAddress, nft.tokenId);
    
    const openSeaUrl = `https://opensea.io/assets/${openSeaChain}/${nft.contractAddress}/${nft.tokenId}`;
    
    // Update or create listing in database
    const existingListing = await db
      .select()
      .from(nftListings)
      .where(and(
        eq(nftListings.nftAssetId, nftId),
        eq(nftListings.marketplace, 'opensea')
      ))
      .limit(1);
    
    if (listings.length > 0) {
      const activeListing = listings[0];
      const priceValue = activeListing.price?.current?.value || '0';
      const priceDecimals = activeListing.price?.current?.decimals || 18;
      const priceEth = (parseFloat(priceValue) / Math.pow(10, priceDecimals)).toFixed(8);
      
      if (existingListing.length > 0) {
        await db
          .update(nftListings)
          .set({
            listPrice: priceEth,
            listingUrl: openSeaUrl,
            listingId: activeListing.order_hash,
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
            marketplace: 'opensea',
            listingUrl: openSeaUrl,
            listingId: activeListing.order_hash,
            listPrice: priceEth,
            currency: 'ETH',
            status: 'active',
            listedAt: new Date(),
          });
      }
      
      return {
        success: true,
        openSeaUrl,
        price: priceEth,
        status: 'active',
      };
    } else {
      // No active listing
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
        openSeaUrl,
        status: 'not_listed',
      };
    }
  } catch (error) {
    console.error('Failed to sync NFT from OpenSea:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create listing on OpenSea (requires wallet signature - returns instructions)
 */
export async function createOpenSeaListingInstructions(nftId: number, priceEth: string): Promise<{
  success: boolean;
  instructions?: string;
  openSeaUrl?: string;
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
      return { success: false, error: 'NFT must be minted on blockchain first' };
    }
    
    const chainMap: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'matic',
      arbitrum: 'arbitrum',
      optimism: 'optimism',
      base: 'base',
    };
    
    const openSeaChain = chainMap[nft.chain || 'ethereum'] || 'ethereum';
    const openSeaUrl = `https://opensea.io/assets/${openSeaChain}/${nft.contractAddress}/${nft.tokenId}/sell`;
    
    return {
      success: true,
      instructions: `To list this NFT on OpenSea for ${priceEth} ETH:\n1. Visit the OpenSea listing page\n2. Connect your wallet that owns this NFT\n3. Set your price and duration\n4. Sign the listing transaction`,
      openSeaUrl,
    };
  } catch (error) {
    console.error('Failed to create OpenSea listing instructions:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if OpenSea API is configured
 */
export function isOpenSeaConfigured(): boolean {
  return !!getOpenSeaApiKey();
}

/**
 * Generate direct OpenSea listing URL for an NFT
 */
export function getOpenSeaListingUrl(contractAddress: string, tokenId: string, chain: string = 'ethereum'): string {
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    polygon: 'matic',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
  };
  const openSeaChain = chainMap[chain] || 'ethereum';
  return `https://opensea.io/assets/${openSeaChain}/${contractAddress}/${tokenId}/sell`;
}

/**
 * Generate OpenSea view URL for an NFT
 */
export function getOpenSeaViewUrl(contractAddress: string, tokenId: string, chain: string = 'ethereum'): string {
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    polygon: 'matic',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
  };
  const openSeaChain = chainMap[chain] || 'ethereum';
  return `https://opensea.io/assets/${openSeaChain}/${contractAddress}/${tokenId}`;
}

/**
 * Batch check listing status for multiple NFTs
 */
export async function batchCheckListingStatus(nftIds: number[]): Promise<Map<number, {
  isListed: boolean;
  price?: string;
  openSeaUrl?: string;
  listingUrl?: string;
}>> {
  const results = new Map();
  
  try {
    const db = await getDb();
    if (!db) {
      return results;
    }
    
    // Get all NFTs
    const nfts = await db
      .select()
      .from(nftAssets)
      .where(eq(nftAssets.id, nftIds[0])); // TODO: Use inArray when available
    
    for (const nftId of nftIds) {
      const nft = nfts.find(n => n.id === nftId);
      if (!nft || !nft.contractAddress || !nft.tokenId) {
        results.set(nftId, { isListed: false });
        continue;
      }
      
      const chain = nft.chain || 'ethereum';
      const viewUrl = getOpenSeaViewUrl(nft.contractAddress, nft.tokenId, chain);
      const listUrl = getOpenSeaListingUrl(nft.contractAddress, nft.tokenId, chain);
      
      // Check existing listing in database
      const [listing] = await db
        .select()
        .from(nftListings)
        .where(and(
          eq(nftListings.nftAssetId, nftId),
          eq(nftListings.marketplace, 'opensea'),
          eq(nftListings.status, 'active')
        ))
        .limit(1);
      
      if (listing) {
        results.set(nftId, {
          isListed: true,
          price: listing.listPrice || undefined,
          openSeaUrl: viewUrl,
          listingUrl: listUrl,
        });
      } else {
        results.set(nftId, {
          isListed: false,
          openSeaUrl: viewUrl,
          listingUrl: listUrl,
        });
      }
    }
  } catch (error) {
    console.error('Failed to batch check listing status:', error);
  }
  
  return results;
}

/**
 * Refresh listing status from OpenSea API for a single NFT
 */
export async function refreshListingStatus(nftId: number): Promise<{
  isListed: boolean;
  price?: string;
  openSeaUrl?: string;
  listingUrl?: string;
  error?: string;
}> {
  try {
    const result = await syncNftFromOpenSea(nftId);
    
    if (!result.success) {
      return { isListed: false, error: result.error };
    }
    
    return {
      isListed: result.status === 'active',
      price: result.price,
      openSeaUrl: result.openSeaUrl,
    };
  } catch (error) {
    return { isListed: false, error: String(error) };
  }
}

/**
 * Get OpenSea API status
 */
export async function getOpenSeaStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  const configured = isOpenSeaConfigured();
  
  if (!configured) {
    return { configured: false, connected: false };
  }
  
  try {
    // Test API connection
    await openSeaRequest('/collections?limit=1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: String(error) };
  }
}
