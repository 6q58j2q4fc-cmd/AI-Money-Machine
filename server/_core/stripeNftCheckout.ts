import Stripe from "stripe";
import { getDb } from "../db";
import { nftAssets, nftSales } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";

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
}

// Get payment history for a user
export async function getUserPaymentHistory(userId: string): Promise<any[]> {
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });

    // Filter by user ID in metadata
    return sessions.data.filter(
      (s: any) =>
        s.metadata?.user_id === userId && s.payment_status === "paid"
    );
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
