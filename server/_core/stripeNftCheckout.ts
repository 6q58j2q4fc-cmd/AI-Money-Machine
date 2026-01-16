import Stripe from "stripe";
import { getDb } from "../db";
import { nftAssets, nftSales } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";
import { notifyNftSold, notifyPaymentReceived } from "./notificationService";
import { sendNftSoldEmail, sendNftPurchasedEmail } from "./emailService";
import { sendNftSoldPush, sendNftPurchasedPush } from "./pushService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// NFT Products configuration
export const NFT_PRODUCTS = {
  standard: {
    name: "NFT Purchase",
    description: "Purchase this unique digital collectible",
  },
};

// Create checkout session for NFT purchase
export async function createNftCheckoutSession(params: {
  nftId: number;
  userId: string;
  userEmail: string;
  userName: string;
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const { nftId, userId, userEmail, userName, origin } = params;

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get NFT details
  const [nft] = await db.select().from(nftAssets).where(eq(nftAssets.id, nftId)).limit(1);

  if (!nft) {
    throw new Error("NFT not found");
  }

  if (nft.status === "sold") {
    throw new Error("NFT is already sold");
  }

  // Convert ETH price to USD cents (approximate conversion)
  const ethPrice = parseFloat(nft.estimatedValue || "0.1");
  const ethToUsd = 2000; // Approximate ETH/USD rate
  const priceInCents = Math.max(50, Math.round(ethPrice * ethToUsd * 100)); // Minimum $0.50

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: nft.name || `NFT #${nft.id}`,
            description: nft.description || "Unique digital collectible",
            images: nft.imageUrl ? [nft.imageUrl] : [],
            metadata: {
              nft_id: nft.id.toString(),
              blockchain: nft.chain || "ethereum",
              category: nft.category || "art",
            },
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/nft/${nftId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/nft/${nftId}?payment=cancelled`,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      customer_email: userEmail,
      customer_name: userName,
      nft_id: nftId.toString(),
      eth_price: ethPrice.toString(),
    },
    allow_promotion_codes: true,
  });

  return {
    url: session.url || "",
    sessionId: session.id,
  };
}

// Handle successful payment webhook
export async function handleNftPaymentSuccess(session: Stripe.Checkout.Session): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  const nftId = parseInt(session.metadata?.nft_id || "0");
  const userId = session.metadata?.user_id || "";
  const customerEmail = session.metadata?.customer_email || "";
  const customerName = session.metadata?.customer_name || "";
  const ethPrice = parseFloat(session.metadata?.eth_price || "0");

  if (!nftId) {
    console.error("[Stripe] No NFT ID in session metadata");
    return;
  }

  // Get NFT details
  const [nft] = await db.select().from(nftAssets).where(eq(nftAssets.id, nftId)).limit(1);

  if (!nft) {
    console.error("[Stripe] NFT not found:", nftId);
    return;
  }

  // Update NFT status to sold
  await db
    .update(nftAssets)
    .set({
      status: "sold",
      updatedAt: new Date(),
    })
    .where(eq(nftAssets.id, nftId));

  // Record the sale
  await db.insert(nftSales).values({
    nftAssetId: nftId,
    userId: parseInt(userId) || 0,
    buyerAddress: customerEmail,
    salePrice: ethPrice.toString(),
    currency: "ETH",
    txHash: session.payment_intent as string,
    marketplace: "stripe",
    royaltyFee: (ethPrice * 0.025).toString(),
    netProceeds: (ethPrice * 0.975).toString(),
    createdAt: new Date(),
  });

  // Notify owner of sale
  await notifyOwner({
    title: `🎉 NFT Sold: ${nft.name}`,
    content: `Your NFT "${nft.name}" was purchased by ${customerName} (${customerEmail}) for ${ethPrice} ETH ($${((session.amount_total || 0) / 100).toFixed(2)} USD). Payment ID: ${session.payment_intent}`,
  });

  console.log(`[Stripe] NFT #${nftId} sold to ${customerEmail} for ${ethPrice} ETH`);

  // Send in-app notifications
  const buyerId = parseInt(userId) || 0;
  const sellerId = nft.userId || 1; // Default to owner if no creator
  const usdPrice = ((session.amount_total || 0) / 100).toFixed(2);
  
  if (buyerId > 0) {
    // Notify buyer
    await notifyNftSold({
      sellerId: sellerId,
      buyerId: buyerId,
      nftId: nftId,
      nftName: nft.name || `NFT #${nftId}`,
      price: ethPrice.toString(),
      currency: "ETH",
    });
    
    // Notify seller of payment received
    await notifyPaymentReceived({
      userId: sellerId,
      amount: `$${usdPrice}`,
      currency: "USD",
      paymentId: 0, // Will be updated when we have payment record ID
      source: `NFT Sale: ${nft.name}`,
    });
  }
  
  // Send email notifications (async, don't block)
  sendNftSoldEmail({
    sellerId: sellerId,
    nftName: nft.name || `NFT #${nftId}`,
    price: ethPrice.toString(),
    currency: "ETH",
    buyerName: customerName,
    linkUrl: `/nft/${nftId}`,
  }).catch(err => console.error("[Stripe] Email notification error:", err));
  
  if (buyerId > 0) {
    sendNftPurchasedEmail({
      buyerId: buyerId,
      nftName: nft.name || `NFT #${nftId}`,
      price: ethPrice.toString(),
      currency: "ETH",
      sellerName: "MoneyMachine",
      linkUrl: `/nft/${nftId}`,
    }).catch(err => console.error("[Stripe] Email notification error:", err));
  }
  
  // Send push notifications (async, don't block)
  sendNftSoldPush({
    userId: sellerId,
    nftName: nft.name || `NFT #${nftId}`,
    price: ethPrice.toString(),
    currency: "ETH",
    url: `/nft/${nftId}`,
  }).catch(err => console.error("[Stripe] Push notification error:", err));
  
  if (buyerId > 0) {
    sendNftPurchasedPush({
      userId: buyerId,
      nftName: nft.name || `NFT #${nftId}`,
      price: ethPrice.toString(),
      currency: "ETH",
      url: `/nft/${nftId}`,
    }).catch(err => console.error("[Stripe] Push notification error:", err));
  }
}

// Get payment history for a user
export async function getUserPaymentHistory(userId: string): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    // First try to get from database (stripePayments table)
    const { stripePayments } = await import("../../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    
    const dbPayments = await db
      .select()
      .from(stripePayments)
      .orderBy(desc(stripePayments.createdAt))
      .limit(100);

    if (dbPayments.length > 0) {
      // Enrich with NFT details
      const enrichedPayments = await Promise.all(
        dbPayments.map(async (payment) => {
          const [nft] = await db
            .select()
            .from(nftAssets)
            .where(eq(nftAssets.id, payment.nftAssetId))
            .limit(1);
          
          return {
            ...payment,
            nftImageUrl: nft?.imageUrl,
            nftCategory: nft?.category,
            nftBlockchain: nft?.chain || 'ethereum',
          };
        })
      );
      return enrichedPayments;
    }

    // Fallback to Stripe API
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });

    // Filter by user ID in metadata and transform
    const paidSessions = sessions.data.filter(
      (s: any) => s.payment_status === "paid"
    );

    return paidSessions.map((s: any) => ({
      id: s.id,
      stripeSessionId: s.id,
      stripePaymentIntentId: s.payment_intent,
      buyerEmail: s.customer_email || s.metadata?.customer_email,
      buyerName: s.metadata?.customer_name,
      nftAssetId: parseInt(s.metadata?.nft_id || '0'),
      nftName: s.metadata?.nft_name || `NFT #${s.metadata?.nft_id}`,
      amountUsd: ((s.amount_total || 0) / 100).toFixed(2),
      amountEth: s.metadata?.eth_price,
      status: 'completed',
      createdAt: new Date(s.created * 1000),
      paidAt: new Date(s.created * 1000),
    }));
  } catch (error) {
    console.error("[Stripe] Error fetching payment history:", error);
    return [];
  }
}

// Verify payment status
export async function verifyPayment(sessionId: string): Promise<{
  paid: boolean;
  nftId: number | null;
  amount: number;
}> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      paid: session.payment_status === "paid",
      nftId: session.metadata?.nft_id ? parseInt(session.metadata.nft_id) : null,
      amount: (session.amount_total || 0) / 100,
    };
  } catch (error) {
    console.error("[Stripe] Error verifying payment:", error);
    return { paid: false, nftId: null, amount: 0 };
  }
}
