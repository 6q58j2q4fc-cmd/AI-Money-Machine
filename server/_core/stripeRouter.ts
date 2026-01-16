/**
 * Stripe Payment Router
 * Handles NFT checkout sessions, payment verification, and webhooks
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./trpc";
import {
  createNftCheckoutSession,
  handleNftPaymentSuccess,
  getUserPaymentHistory,
  verifyPayment,
} from "./stripeNftCheckout";
import { getDb } from "../db";
import { nftAssets, nftSales } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  notifyBuyerPurchaseConfirmed,
  notifySellerNFTSold,
} from "./nftEmailNotifications";

export const stripeRouter = router({
  // Create checkout session for NFT purchase
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        nftId: z.number(),
        userId: z.string().optional(),
        userEmail: z.string().email(),
        userName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || ctx.req.headers.host || "https://monetizemac-rymvrvam.manus.space";
      
      return createNftCheckoutSession({
        nftId: input.nftId,
        userId: input.userId || "guest",
        userEmail: input.userEmail,
        userName: input.userName || "Guest Buyer",
        origin: origin.startsWith("http") ? origin : `https://${origin}`,
      });
    }),

  // Verify payment status
  verifyPayment: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return verifyPayment(input.sessionId);
    }),

  // Get user's payment history
  getPaymentHistory: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserPaymentHistory(ctx.user.id.toString());
    }),

  // Get sales statistics (admin only)
  getSalesStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalSales: 0, totalRevenue: 0, recentSales: [] };

    // Get total sales count and revenue
    const [stats] = await db
      .select({
        totalSales: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${nftSales.salePrice} AS DECIMAL(18,8))), 0)`,
      })
      .from(nftSales);

    // Get recent sales
    const recentSales = await db
      .select({
        id: nftSales.id,
        nftAssetId: nftSales.nftAssetId,
        salePrice: nftSales.salePrice,
        currency: nftSales.currency,
        buyerAddress: nftSales.buyerAddress,
        marketplace: nftSales.marketplace,
        txHash: nftSales.txHash,
        createdAt: nftSales.createdAt,
      })
      .from(nftSales)
      .orderBy(desc(nftSales.createdAt))
      .limit(10);

    return {
      totalSales: Number(stats?.totalSales) || 0,
      totalRevenue: Number(stats?.totalRevenue) || 0,
      recentSales,
    };
  }),

  // Get withdrawable balance (from confirmed sales)
  getWithdrawableBalance: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { balance: 0, currency: "ETH", salesCount: 0 };

    const [result] = await db
      .select({
        totalBalance: sql<number>`COALESCE(SUM(CAST(${nftSales.netProceeds} AS DECIMAL(18,8))), 0)`,
        salesCount: sql<number>`COUNT(*)`,
      })
      .from(nftSales);

    return {
      balance: Number(result?.totalBalance) || 0,
      currency: "ETH",
      salesCount: Number(result?.salesCount) || 0,
    };
  }),

  // Process payment success (called after Stripe webhook or client verification)
  processPaymentSuccess: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        nftId: z.number(),
        buyerEmail: z.string(),
        buyerWallet: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the payment
      const payment = await verifyPayment(input.sessionId);
      if (!payment.paid) {
        throw new Error("Payment not confirmed");
      }

      // Get NFT details
      const [nft] = await db
        .select()
        .from(nftAssets)
        .where(eq(nftAssets.id, input.nftId))
        .limit(1);

      if (!nft) {
        throw new Error("NFT not found");
      }

      // Send notifications
      await notifyBuyerPurchaseConfirmed(
        {
          id: nft.id,
          name: nft.name || `NFT #${nft.id}`,
          imageUrl: nft.imageUrl,
          price: payment.amount,
          blockchain: nft.chain || "ethereum",
          tokenId: nft.tokenId || undefined,
          contractAddress: nft.contractAddress || undefined,
        },
        {
          email: input.buyerEmail,
          walletAddress: input.buyerWallet || input.buyerEmail,
        },
        {
          txHash: input.sessionId,
          amount: payment.amount,
          currency: "USD",
          timestamp: new Date(),
        }
      );

      // Notify seller (owner)
      await notifySellerNFTSold(
        {
          id: nft.id,
          name: nft.name || `NFT #${nft.id}`,
          imageUrl: nft.imageUrl,
          price: payment.amount,
          blockchain: nft.chain || "ethereum",
          tokenId: nft.tokenId || undefined,
          contractAddress: nft.contractAddress || undefined,
        },
        {
          walletAddress: "0x75812e1c4246A880f6576db8292405247e6a8775",
          name: "Dakota Rea",
        },
        {
          email: input.buyerEmail,
          walletAddress: input.buyerWallet || input.buyerEmail,
        },
        {
          txHash: input.sessionId,
          amount: payment.amount,
          currency: "USD",
          timestamp: new Date(),
          marketplaceFee: payment.amount * 0.025,
          royaltyFee: 0,
          netAmount: payment.amount * 0.975,
        }
      );

      return {
        success: true,
        nftId: input.nftId,
        amount: payment.amount,
      };
    }),

  // Get NFT purchase details
  getNftPurchaseDetails: publicProcedure
    .input(z.object({ nftId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [nft] = await db
        .select()
        .from(nftAssets)
        .where(eq(nftAssets.id, input.nftId))
        .limit(1);

      if (!nft) return null;

      // Calculate USD price
      const ethPrice = parseFloat(nft.estimatedValue || "0.1");
      const ethToUsd = 2000;
      const usdPrice = ethPrice * ethToUsd;

      return {
        id: nft.id,
        name: nft.name,
        description: nft.description,
        imageUrl: nft.imageUrl,
        category: nft.category,
        blockchain: nft.chain || "ethereum",
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        ethPrice,
        usdPrice,
        status: nft.status,
        isSold: nft.status === "sold",
      };
    }),
});
