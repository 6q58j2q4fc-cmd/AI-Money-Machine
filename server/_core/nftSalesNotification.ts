/**
 * NFT Sales Notification Service
 * Sends notifications when NFTs are sold, listed, or have price changes
 */

import { notifyOwner } from "./notification";
import { getDb } from "../db";
import { nftAssets, nftSales, nftListings } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface NFTSaleNotification {
  nftId: number;
  nftName: string;
  salePrice: string;
  currency: string;
  marketplace: string;
  buyerAddress: string;
  transactionHash: string;
  royaltyAmount?: string;
}

export interface NFTListingNotification {
  nftId: number;
  nftName: string;
  listPrice: string;
  currency: string;
  marketplace: string;
  listingUrl: string;
}

/**
 * Send notification when an NFT is sold
 */
export async function notifyNFTSale(sale: NFTSaleNotification): Promise<boolean> {
  const title = `🎉 NFT SOLD: ${sale.nftName}`;
  const content = `
**NFT Sale Confirmed!**

**NFT:** ${sale.nftName}
**Sale Price:** ${sale.salePrice} ${sale.currency}
**Marketplace:** ${sale.marketplace}
**Buyer:** ${sale.buyerAddress.slice(0, 6)}...${sale.buyerAddress.slice(-4)}
**Transaction:** ${sale.transactionHash}
${sale.royaltyAmount ? `**Royalty Earned:** ${sale.royaltyAmount} ${sale.currency}` : ''}

The funds have been credited to your Hot Wallet.

View transaction: https://etherscan.io/tx/${sale.transactionHash}
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Send notification when an NFT is listed
 */
export async function notifyNFTListing(listing: NFTListingNotification): Promise<boolean> {
  const title = `📢 NFT Listed: ${listing.nftName}`;
  const content = `
**NFT Listed for Sale!**

**NFT:** ${listing.nftName}
**List Price:** ${listing.listPrice} ${listing.currency}
**Marketplace:** ${listing.marketplace}

View listing: ${listing.listingUrl}
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Send daily earnings summary notification
 */
export async function notifyDailyEarnings(earnings: {
  totalSales: number;
  totalRevenue: string;
  currency: string;
  topSale?: { name: string; price: string };
  pendingWithdrawals: string;
}): Promise<boolean> {
  const title = `📊 Daily Earnings Summary`;
  const content = `
**Your Daily NFT Earnings Report**

**Total Sales:** ${earnings.totalSales}
**Total Revenue:** ${earnings.totalRevenue} ${earnings.currency}
${earnings.topSale ? `**Top Sale:** ${earnings.topSale.name} (${earnings.topSale.price} ${earnings.currency})` : ''}
**Pending Withdrawals:** ${earnings.pendingWithdrawals} ${earnings.currency}

View full analytics in your dashboard.
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Send notification for new faucet earnings
 */
export async function notifyFaucetEarnings(earnings: {
  platform: string;
  amount: string;
  currency: string;
  totalToday: string;
}): Promise<boolean> {
  const title = `💰 Faucet Claim: ${earnings.platform}`;
  const content = `
**Faucet Earnings Received!**

**Platform:** ${earnings.platform}
**Amount:** ${earnings.amount} ${earnings.currency}
**Total Today:** ${earnings.totalToday} ${earnings.currency}

Funds have been added to your Hot Wallet.
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Send notification when withdrawal is completed
 */
export async function notifyWithdrawal(withdrawal: {
  amount: string;
  currency: string;
  destinationAddress: string;
  transactionHash: string;
}): Promise<boolean> {
  const title = `✅ Withdrawal Completed`;
  const content = `
**Withdrawal Successful!**

**Amount:** ${withdrawal.amount} ${withdrawal.currency}
**Destination:** ${withdrawal.destinationAddress.slice(0, 6)}...${withdrawal.destinationAddress.slice(-4)}
**Transaction:** ${withdrawal.transactionHash}

View transaction: https://etherscan.io/tx/${withdrawal.transactionHash}
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Send notification for price alerts
 */
export async function notifyPriceAlert(alert: {
  nftName: string;
  currentPrice: string;
  previousPrice: string;
  currency: string;
  changePercent: number;
  marketplace: string;
}): Promise<boolean> {
  const direction = alert.changePercent > 0 ? '📈' : '📉';
  const title = `${direction} Price Alert: ${alert.nftName}`;
  const content = `
**NFT Price Change Detected!**

**NFT:** ${alert.nftName}
**Previous Price:** ${alert.previousPrice} ${alert.currency}
**Current Price:** ${alert.currentPrice} ${alert.currency}
**Change:** ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}%
**Marketplace:** ${alert.marketplace}
  `.trim();

  return notifyOwner({ title, content });
}

/**
 * Record and notify a new sale
 */
export async function recordAndNotifySale(saleData: {
  nftAssetId: number;
  buyerAddress: string;
  salePrice: string;
  currency: string;
  marketplace: string;
  transactionHash: string;
  royaltyAmount?: string;
}): Promise<{ success: boolean; saleId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    // Get NFT details
    const [nft] = await db.select().from(nftAssets).where(eq(nftAssets.id, saleData.nftAssetId));
    if (!nft) return { success: false, error: 'NFT not found' };

    // Record the sale
    const [result] = await db.insert(nftSales).values({
      nftAssetId: saleData.nftAssetId,
      userId: nft.userId,
      buyerAddress: saleData.buyerAddress,
      salePrice: saleData.salePrice,
      currency: saleData.currency,
      marketplace: saleData.marketplace,
      txHash: saleData.transactionHash,
      soldAt: new Date(),
      createdAt: new Date(),
    });

    // Update NFT status
    await db.update(nftAssets)
      .set({ status: 'sold', lastSalePrice: saleData.salePrice })
      .where(eq(nftAssets.id, saleData.nftAssetId));

    // Send notification
    await notifyNFTSale({
      nftId: saleData.nftAssetId,
      nftName: nft.name,
      salePrice: saleData.salePrice,
      currency: saleData.currency,
      marketplace: saleData.marketplace,
      buyerAddress: saleData.buyerAddress,
      transactionHash: saleData.transactionHash,
      royaltyAmount: saleData.royaltyAmount,
    });

    return { success: true, saleId: result.insertId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get recent sales for notification digest
 */
export async function getRecentSalesForDigest(hours: number = 24): Promise<{
  sales: Array<{
    nftName: string;
    salePrice: string;
    currency: string;
    marketplace: string;
    soldAt: Date;
  }>;
  totalRevenue: string;
  totalSales: number;
}> {
  const db = await getDb();
  if (!db) return { sales: [], totalRevenue: '0', totalSales: 0 };

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const sales = await db.select({
    nftName: nftAssets.name,
    salePrice: nftSales.salePrice,
    currency: nftSales.currency,
    marketplace: nftSales.marketplace,
    soldAt: nftSales.soldAt,
  })
    .from(nftSales)
    .innerJoin(nftAssets, eq(nftSales.nftAssetId, nftAssets.id))
    .where(eq(nftSales.isPaidOut, false))
    .orderBy(desc(nftSales.soldAt))
    .limit(100);

  const recentSales = sales.filter(s => s.soldAt && new Date(s.soldAt) > cutoff);
  
  const totalRevenue = recentSales.reduce((sum, s) => sum + parseFloat(s.salePrice), 0);

  return {
    sales: recentSales.map(s => ({
      nftName: s.nftName,
      salePrice: s.salePrice,
      currency: s.currency || 'ETH',
      marketplace: s.marketplace,
      soldAt: s.soldAt || new Date(),
    })),
    totalRevenue: totalRevenue.toFixed(4),
    totalSales: recentSales.length,
  };
}
