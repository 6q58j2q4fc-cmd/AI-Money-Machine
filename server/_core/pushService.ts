/**
 * Push Notification Service
 * Handles web push notifications using the Web Push API
 */

import webPush from 'web-push';
import { getDb } from "../db";
import { pushSubscriptions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// VAPID keys for web push authentication
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BGJhHSCx4qYqOSkGDTKp9mWHAvpNNZL32oi12cVQ91_NoNzhUDUpajk2xPB7VytVhPp8Xoap8gD7_ILAN3DNKV8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'zLB2dfaagSX3vW210TTpLOiZ4OUUoB2--YdXk3kchgg';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@moneymachine.app';

// Configure web-push with VAPID details
webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: Record<string, unknown>;
}

// Get VAPID public key for client-side subscription
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// Check if push notifications are configured
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

// Send push notification to a specific user
export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  try {
    // Get user's active push subscriptions
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      ));
    
    if (subscriptions.length === 0) {
      console.log(`[PushService] No active subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subscriptions) {
      try {
        // Create push subscription object
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey
          }
        };
        
        // Send the push notification using web-push
        await webPush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        
        console.log(`[PushService] Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        
        // Update last used timestamp
        await db.update(pushSubscriptions)
          .set({ lastUsed: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
        
        sent++;
      } catch (error: unknown) {
        console.error(`[PushService] Failed to send to subscription ${sub.id}:`, error);
        
        // Check if subscription is expired or invalid (410 Gone or 404 Not Found)
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Deactivate the subscription
          await db.update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
          console.log(`[PushService] Deactivated expired subscription ${sub.id}`);
        }
        
        failed++;
      }
    }
    
    return { sent, failed };
  } catch (error) {
    console.error("[PushService] Error sending push notifications:", error);
    return { sent: 0, failed: 0 };
  }
}

// Send push notification to multiple users
export async function sendPushToUsers(
  userIds: number[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }
  
  return { sent: totalSent, failed: totalFailed };
}

// Convenience functions for common push notifications
export async function sendNftSoldPush(params: {
  userId: number;
  nftName: string;
  price: string;
  currency: string;
  url: string;
}): Promise<{ sent: number; failed: number }> {
  return sendPushToUser(params.userId, {
    title: "🎉 NFT Sold!",
    body: `Your NFT "${params.nftName}" was sold for ${params.price} ${params.currency}`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: params.url,
    tag: "nft-sold",
    requireInteraction: true,
    actions: [
      { action: "view", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { type: "nft_sold", nftName: params.nftName, price: params.price },
  });
}

export async function sendNftPurchasedPush(params: {
  userId: number;
  nftName: string;
  price: string;
  currency: string;
  url: string;
}): Promise<{ sent: number; failed: number }> {
  return sendPushToUser(params.userId, {
    title: "🎨 Purchase Complete!",
    body: `You purchased "${params.nftName}" for ${params.price} ${params.currency}`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: params.url,
    tag: "nft-purchased",
    actions: [
      { action: "view", title: "View NFT" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { type: "nft_purchased", nftName: params.nftName, price: params.price },
  });
}

export async function sendPaymentReceivedPush(params: {
  userId: number;
  amount: string;
  currency: string;
  source: string;
  url: string;
}): Promise<{ sent: number; failed: number }> {
  return sendPushToUser(params.userId, {
    title: "💰 Payment Received!",
    body: `You received ${params.amount} ${params.currency} from ${params.source}`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: params.url,
    tag: "payment-received",
    requireInteraction: true,
    actions: [
      { action: "view", title: "View Payment" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { type: "payment_received", amount: params.amount },
  });
}

export async function sendPriceAlertPush(params: {
  userId: number;
  nftName: string;
  oldPrice: string;
  newPrice: string;
  currency: string;
  direction: "up" | "down";
  url: string;
}): Promise<{ sent: number; failed: number }> {
  const emoji = params.direction === "up" ? "📈" : "📉";
  const action = params.direction === "up" ? "increased" : "decreased";
  
  return sendPushToUser(params.userId, {
    title: `${emoji} Price Alert`,
    body: `"${params.nftName}" ${action} from ${params.oldPrice} to ${params.newPrice} ${params.currency}`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: params.url,
    tag: "price-alert",
    actions: [
      { action: "view", title: "View NFT" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { type: "price_alert", nftName: params.nftName, direction: params.direction },
  });
}

console.log("[PushService] Service initialized with VAPID keys");
console.log(`[PushService] Push configured: ${isPushConfigured()}`);
