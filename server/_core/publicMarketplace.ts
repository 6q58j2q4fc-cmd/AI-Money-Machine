/**
 * Public NFT Marketplace Service
 * Handles wallet-based authentication and public marketplace operations
 */

import { getDb } from "../db";
import { 
  marketplaceUsers, 
  nftPurchases, 
  userNftCollection, 
  userFavorites,
  nftAssets,
  nftListings,
  nftSales
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, or, gte, lte, inArray } from "drizzle-orm";
import crypto from "crypto";

// Generate a random nonce for wallet signature verification
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Get or create marketplace user by wallet address
export async function getOrCreateMarketplaceUser(walletAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedAddress = walletAddress.toLowerCase();
  
  // Check if user exists
  const existing = await db
    .select()
    .from(marketplaceUsers)
    .where(eq(marketplaceUsers.walletAddress, normalizedAddress))
    .limit(1);
  
  if (existing.length > 0) {
    // Update nonce for new login
    const newNonce = generateNonce();
    await db
      .update(marketplaceUsers)
      .set({ nonce: newNonce, lastLoginAt: new Date() })
      .where(eq(marketplaceUsers.id, existing[0].id));
    
    return { ...existing[0], nonce: newNonce };
  }
  
  // Create new user
  const nonce = generateNonce();
  const result = await db.insert(marketplaceUsers).values({
    walletAddress: normalizedAddress,
    nonce,
    lastLoginAt: new Date(),
  });
  
  const newUser = await db
    .select()
    .from(marketplaceUsers)
    .where(eq(marketplaceUsers.id, result[0].insertId))
    .limit(1);
  
  return newUser[0];
}

// Get marketplace user by wallet address
export async function getMarketplaceUser(walletAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedAddress = walletAddress.toLowerCase();
  
  const user = await db
    .select()
    .from(marketplaceUsers)
    .where(eq(marketplaceUsers.walletAddress, normalizedAddress))
    .limit(1);
  
  return user[0] || null;
}

// Update user profile
export async function updateUserProfile(
  userId: number,
  data: {
    username?: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
    twitterHandle?: string;
    discordHandle?: string;
    websiteUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(marketplaceUsers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(marketplaceUsers.id, userId));
  
  return getMarketplaceUserById(userId);
}

// Get user by ID
export async function getMarketplaceUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await db
    .select()
    .from(marketplaceUsers)
    .where(eq(marketplaceUsers.id, userId))
    .limit(1);
  
  return user[0] || null;
}

// Get public NFTs for marketplace (no auth required)
export async function getPublicNFTs(options: {
  limit?: number;
  offset?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  chain?: string;
  search?: string;
  sortBy?: "price_asc" | "price_desc" | "newest" | "popular";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { limit = 20, offset = 0, category, minPrice, maxPrice, chain, search, sortBy = "newest" } = options;
  
  // Build conditions
  const conditions = [
    eq(nftAssets.status, "listed"),
  ];
  
  if (category) {
    conditions.push(eq(nftAssets.category, category));
  }
  
  if (chain) {
    conditions.push(eq(nftAssets.chain, chain as any));
  }
  
  if (search) {
    conditions.push(
      or(
        like(nftAssets.name, `%${search}%`),
        like(nftAssets.description, `%${search}%`)
      )!
    );
  }
  
  // Get NFTs with their listings
  const nfts = await db
    .select({
      id: nftAssets.id,
      name: nftAssets.name,
      description: nftAssets.description,
      imageUrl: nftAssets.imageUrl,
      thumbnailUrl: nftAssets.thumbnailUrl,
      category: nftAssets.category,
      style: nftAssets.style,
      traits: nftAssets.traits,
      tokenId: nftAssets.tokenId,
      contractAddress: nftAssets.contractAddress,
      chain: nftAssets.chain,
      estimatedValue: nftAssets.estimatedValue,
      views: nftAssets.views,
      likes: nftAssets.likes,
      createdAt: nftAssets.createdAt,
    })
    .from(nftAssets)
    .where(and(...conditions))
    .orderBy(
      sortBy === "newest" ? desc(nftAssets.createdAt) :
      sortBy === "popular" ? desc(nftAssets.views) :
      desc(nftAssets.createdAt)
    )
    .limit(limit)
    .offset(offset);
  
  // Get active listings for these NFTs
  const nftIds = nfts.map(n => n.id);
  let listings: any[] = [];
  
  if (nftIds.length > 0) {
    listings = await db
      .select()
      .from(nftListings)
      .where(and(
        inArray(nftListings.nftAssetId, nftIds),
        eq(nftListings.status, "active")
      ));
  }
  
  // Merge listings with NFTs
  const nftsWithListings = nfts.map(nft => {
    const listing = listings.find(l => l.nftAssetId === nft.id);
    return {
      ...nft,
      listPrice: listing?.listPrice || nft.estimatedValue,
      currency: listing?.currency || "ETH",
      listingId: listing?.id,
      marketplace: listing?.marketplace || "internal",
    };
  });
  
  // Filter by price if specified
  let filteredNfts = nftsWithListings;
  if (minPrice !== undefined) {
    filteredNfts = filteredNfts.filter(n => parseFloat(String(n.listPrice)) >= minPrice);
  }
  if (maxPrice !== undefined) {
    filteredNfts = filteredNfts.filter(n => parseFloat(String(n.listPrice)) <= maxPrice);
  }
  
  // Sort by price if needed
  if (sortBy === "price_asc") {
    filteredNfts.sort((a, b) => parseFloat(String(a.listPrice)) - parseFloat(String(b.listPrice)));
  } else if (sortBy === "price_desc") {
    filteredNfts.sort((a, b) => parseFloat(String(b.listPrice)) - parseFloat(String(a.listPrice)));
  }
  
  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(nftAssets)
    .where(and(...conditions));
  
  return {
    nfts: filteredNfts,
    total: countResult[0]?.count || 0,
    hasMore: offset + limit < (countResult[0]?.count || 0),
  };
}

// Get single NFT details (public)
export async function getNFTDetails(nftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Increment view count
  await db
    .update(nftAssets)
    .set({ views: sql`${nftAssets.views} + 1` })
    .where(eq(nftAssets.id, nftId));
  
  const nft = await db
    .select()
    .from(nftAssets)
    .where(eq(nftAssets.id, nftId))
    .limit(1);
  
  if (!nft[0]) return null;
  
  // Get active listing
  const listing = await db
    .select()
    .from(nftListings)
    .where(and(
      eq(nftListings.nftAssetId, nftId),
      eq(nftListings.status, "active")
    ))
    .limit(1);
  
  // Get sale history
  const sales = await db
    .select()
    .from(nftSales)
    .where(eq(nftSales.nftAssetId, nftId))
    .orderBy(desc(nftSales.soldAt))
    .limit(10);
  
  return {
    ...nft[0],
    listing: listing[0] || null,
    salesHistory: sales,
  };
}

// Add to favorites
export async function addToFavorites(userId: number, nftAssetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already favorited
  const existing = await db
    .select()
    .from(userFavorites)
    .where(and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.nftAssetId, nftAssetId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return { success: true, message: "Already in favorites" };
  }
  
  await db.insert(userFavorites).values({
    userId,
    nftAssetId,
  });
  
  // Increment likes count on NFT
  await db
    .update(nftAssets)
    .set({ likes: sql`${nftAssets.likes} + 1` })
    .where(eq(nftAssets.id, nftAssetId));
  
  return { success: true, message: "Added to favorites" };
}

// Remove from favorites
export async function removeFromFavorites(userId: number, nftAssetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(userFavorites)
    .where(and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.nftAssetId, nftAssetId)
    ));
  
  // Decrement likes count on NFT
  await db
    .update(nftAssets)
    .set({ likes: sql`GREATEST(${nftAssets.likes} - 1, 0)` })
    .where(eq(nftAssets.id, nftAssetId));
  
  return { success: true, message: "Removed from favorites" };
}

// Get user favorites
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const favorites = await db
    .select({
      id: userFavorites.id,
      nftAssetId: userFavorites.nftAssetId,
      createdAt: userFavorites.createdAt,
      nft: {
        id: nftAssets.id,
        name: nftAssets.name,
        imageUrl: nftAssets.imageUrl,
        category: nftAssets.category,
        estimatedValue: nftAssets.estimatedValue,
        status: nftAssets.status,
      },
    })
    .from(userFavorites)
    .innerJoin(nftAssets, eq(userFavorites.nftAssetId, nftAssets.id))
    .where(eq(userFavorites.userId, userId))
    .orderBy(desc(userFavorites.createdAt));
  
  return favorites;
}

// Record a purchase
export async function recordPurchase(data: {
  buyerId: number;
  buyerWallet: string;
  nftAssetId: number;
  purchasePrice: string;
  currency: string;
  chain: string;
  txHash?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get NFT details
  const nft = await db
    .select()
    .from(nftAssets)
    .where(eq(nftAssets.id, data.nftAssetId))
    .limit(1);
  
  if (!nft[0]) {
    throw new Error("NFT not found");
  }
  
  // Create purchase record
  const result = await db.insert(nftPurchases).values({
    buyerId: data.buyerId,
    buyerWallet: data.buyerWallet.toLowerCase(),
    nftAssetId: data.nftAssetId,
    tokenId: nft[0].tokenId,
    contractAddress: nft[0].contractAddress,
    purchasePrice: data.purchasePrice,
    currency: data.currency,
    chain: data.chain,
    txHash: data.txHash,
    status: data.txHash ? "confirming" : "pending",
  });
  
  // Add to user's collection
  await db.insert(userNftCollection).values({
    userId: data.buyerId,
    nftAssetId: data.nftAssetId,
    acquiredPrice: data.purchasePrice,
    purchaseId: result[0].insertId,
  });
  
  // Update NFT status
  await db
    .update(nftAssets)
    .set({ status: "sold" })
    .where(eq(nftAssets.id, data.nftAssetId));
  
  // Update buyer stats
  await db
    .update(marketplaceUsers)
    .set({
      totalPurchases: sql`${marketplaceUsers.totalPurchases} + 1`,
      totalSpent: sql`${marketplaceUsers.totalSpent} + ${data.purchasePrice}`,
    })
    .where(eq(marketplaceUsers.id, data.buyerId));
  
  return { purchaseId: result[0].insertId, success: true };
}

// Get user's purchase history
export async function getUserPurchases(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const purchases = await db
    .select({
      id: nftPurchases.id,
      purchasePrice: nftPurchases.purchasePrice,
      currency: nftPurchases.currency,
      chain: nftPurchases.chain,
      txHash: nftPurchases.txHash,
      status: nftPurchases.status,
      purchasedAt: nftPurchases.purchasedAt,
      nft: {
        id: nftAssets.id,
        name: nftAssets.name,
        imageUrl: nftAssets.imageUrl,
        category: nftAssets.category,
      },
    })
    .from(nftPurchases)
    .innerJoin(nftAssets, eq(nftPurchases.nftAssetId, nftAssets.id))
    .where(eq(nftPurchases.buyerId, userId))
    .orderBy(desc(nftPurchases.purchasedAt));
  
  return purchases;
}

// Get user's NFT collection
export async function getUserCollection(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const collection = await db
    .select({
      id: userNftCollection.id,
      acquiredAt: userNftCollection.acquiredAt,
      acquiredPrice: userNftCollection.acquiredPrice,
      isListed: userNftCollection.isListed,
      listPrice: userNftCollection.listPrice,
      nft: {
        id: nftAssets.id,
        name: nftAssets.name,
        imageUrl: nftAssets.imageUrl,
        category: nftAssets.category,
        estimatedValue: nftAssets.estimatedValue,
        tokenId: nftAssets.tokenId,
        contractAddress: nftAssets.contractAddress,
        chain: nftAssets.chain,
      },
    })
    .from(userNftCollection)
    .innerJoin(nftAssets, eq(userNftCollection.nftAssetId, nftAssets.id))
    .where(eq(userNftCollection.userId, userId))
    .orderBy(desc(userNftCollection.acquiredAt));
  
  return collection;
}

// Get marketplace stats (public)
export async function getMarketplaceStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Total NFTs listed
  const listedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(nftAssets)
    .where(eq(nftAssets.status, "listed"));
  
  // Total sales
  const salesCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(nftSales);
  
  // Total volume
  const volumeResult = await db
    .select({ total: sql<string>`COALESCE(SUM(salePrice), 0)` })
    .from(nftSales);
  
  // Unique buyers
  const buyersCount = await db
    .select({ count: sql<number>`count(DISTINCT buyerId)` })
    .from(nftPurchases);
  
  // Floor price (lowest listed price)
  const floorResult = await db
    .select({ floor: sql<string>`MIN(listPrice)` })
    .from(nftListings)
    .where(eq(nftListings.status, "active"));
  
  return {
    totalListed: listedCount[0]?.count || 0,
    totalSales: salesCount[0]?.count || 0,
    totalVolume: volumeResult[0]?.total || "0",
    uniqueBuyers: buyersCount[0]?.count || 0,
    floorPrice: floorResult[0]?.floor || "0",
  };
}

// Get featured NFTs (most viewed/liked)
export async function getFeaturedNFTs(limit: number = 8) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const featured = await db
    .select({
      id: nftAssets.id,
      name: nftAssets.name,
      description: nftAssets.description,
      imageUrl: nftAssets.imageUrl,
      category: nftAssets.category,
      estimatedValue: nftAssets.estimatedValue,
      views: nftAssets.views,
      likes: nftAssets.likes,
      chain: nftAssets.chain,
    })
    .from(nftAssets)
    .where(eq(nftAssets.status, "listed"))
    .orderBy(desc(sql`${nftAssets.views} + ${nftAssets.likes} * 2`))
    .limit(limit);
  
  return featured;
}

// Get categories with counts
export async function getCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const categories = await db
    .select({
      category: nftAssets.category,
      count: sql<number>`count(*)`,
    })
    .from(nftAssets)
    .where(eq(nftAssets.status, "listed"))
    .groupBy(nftAssets.category)
    .orderBy(desc(sql`count(*)`));
  
  return categories;
}

// Get user by wallet address

// Stripe checkout for NFT purchase
import { createNftCheckoutSession, verifyPayment } from "./stripeNftCheckout";

export async function createCheckoutForNft(
  nftId: number,
  userId: string,
  userEmail: string,
  userName: string,
  origin: string
): Promise<{ url: string; sessionId: string }> {
  return createNftCheckoutSession({
    nftId,
    userId,
    userEmail,
    userName,
    origin,
  });
}

export async function verifyNftPayment(sessionId: string) {
  return verifyPayment(sessionId);
}
