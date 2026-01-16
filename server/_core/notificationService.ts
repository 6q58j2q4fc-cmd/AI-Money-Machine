/**
 * Notification Service - Handles in-app, email, and push notifications
 */

import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { 
  notifications, 
  notificationPreferences, 
  pushSubscriptions,
  type Notification,
  type InsertNotification,
  type NotificationPreference,
  type InsertNotificationPreference
} from "../../drizzle/schema";
import { notifyOwner } from "./notification";

// Notification types
export type NotificationType = 
  | "nft_sold"
  | "nft_purchased"
  | "price_alert"
  | "new_listing"
  | "article_published"
  | "article_distributed"
  | "payment_received"
  | "payment_sent"
  | "system"
  | "promotion";

// Create a new notification
export async function createNotification(data: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkText?: string;
  relatedNftId?: number;
  relatedArticleId?: number;
  relatedPaymentId?: number;
  metadata?: Record<string, unknown>;
}): Promise<Notification | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // Check user preferences
    const prefs = await getUserPreferences(data.userId);
    
    // Check if in-app notifications are enabled for this type
    if (!shouldSendInApp(prefs, data.type)) {
      console.log(`[Notification] In-app disabled for type ${data.type} for user ${data.userId}`);
      return null;
    }
    
    // Create the notification
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      linkUrl: data.linkUrl,
      linkText: data.linkText,
      relatedNftId: data.relatedNftId,
      relatedArticleId: data.relatedArticleId,
      relatedPaymentId: data.relatedPaymentId,
      metadata: data.metadata,
    });
    
    // Get the created notification
    const [created] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, data.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(1);
    
    // Send email if enabled
    if (shouldSendEmail(prefs, data.type)) {
      await sendEmailNotification(data.userId, data.type, data.title, data.message, data.linkUrl);
      if (created) {
        await db.update(notifications)
          .set({ emailSent: true, emailSentAt: new Date() })
          .where(eq(notifications.id, created.id));
      }
    }
    
    // Send push if enabled
    if (shouldSendPush(prefs, data.type)) {
      await sendPushNotification(data.userId, data.title, data.message, data.linkUrl);
      if (created) {
        await db.update(notifications)
          .set({ pushSent: true, pushSentAt: new Date() })
          .where(eq(notifications.id, created.id));
      }
    }
    
    return created || null;
  } catch (error) {
    console.error("[Notification] Error creating notification:", error);
    return null;
  }
}

// Get user's notifications
export async function getUserNotifications(
  userId: number,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const db = await getDb();
  if (!db) return { notifications: [], total: 0, unreadCount: 0 };
  const { limit = 20, offset = 0, unreadOnly = false } = options;
  
  try {
    // Build query conditions
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    // Get notifications
    const notifs = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    
    // Get unread count
    const [unreadResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    
    return {
      notifications: notifs,
      total: totalResult?.count || 0,
      unreadCount: unreadResult?.count || 0,
    };
  } catch (error) {
    console.error("[Notification] Error getting notifications:", error);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

// Mark notification as read
export async function markAsRead(notificationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return true;
  } catch (error) {
    console.error("[Notification] Error marking as read:", error);
    return false;
  }
}

// Mark all notifications as read
export async function markAllAsRead(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return true;
  } catch (error) {
    console.error("[Notification] Error marking all as read:", error);
    return false;
  }
}

// Delete a notification
export async function deleteNotification(notificationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return true;
  } catch (error) {
    console.error("[Notification] Error deleting notification:", error);
    return false;
  }
}

// Get or create user preferences
export async function getUserPreferences(userId: number): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    
    if (prefs) return prefs;
    
    // Create default preferences
    await db.insert(notificationPreferences).values({ userId });
    
    const [created] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    
    return created || null;
  } catch (error) {
    console.error("[Notification] Error getting preferences:", error);
    return null;
  }
}

// Update user preferences
export async function updateUserPreferences(
  userId: number,
  updates: Partial<InsertNotificationPreference>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Ensure preferences exist
    await getUserPreferences(userId);
    
    await db.update(notificationPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId));
    
    return true;
  } catch (error) {
    console.error("[Notification] Error updating preferences:", error);
    return false;
  }
}

// Check if should send in-app notification
function shouldSendInApp(prefs: NotificationPreference | null, type: NotificationType): boolean {
  if (!prefs || !prefs.inAppEnabled) return true; // Default to true if no prefs
  
  switch (type) {
    case "nft_sold": return prefs.inAppNftSold;
    case "nft_purchased": return prefs.inAppNftPurchased;
    case "price_alert": return prefs.inAppPriceAlert;
    case "new_listing": return prefs.inAppNewListing;
    case "article_published":
    case "article_distributed": return prefs.inAppArticle;
    case "payment_received":
    case "payment_sent": return prefs.inAppPayment;
    case "system": return prefs.inAppSystem;
    case "promotion": return prefs.inAppPromotion;
    default: return true;
  }
}

// Check if should send email notification
function shouldSendEmail(prefs: NotificationPreference | null, type: NotificationType): boolean {
  if (!prefs || !prefs.emailEnabled) return false;
  
  switch (type) {
    case "nft_sold": return prefs.emailNftSold;
    case "nft_purchased": return prefs.emailNftPurchased;
    case "price_alert": return prefs.emailPriceAlert;
    case "new_listing": return prefs.emailNewListing;
    case "article_published":
    case "article_distributed": return prefs.emailArticle;
    case "payment_received":
    case "payment_sent": return prefs.emailPayment;
    default: return false;
  }
}

// Check if should send push notification
function shouldSendPush(prefs: NotificationPreference | null, type: NotificationType): boolean {
  if (!prefs || !prefs.pushEnabled) return false;
  
  switch (type) {
    case "nft_sold": return prefs.pushNftSold;
    case "nft_purchased": return prefs.pushNftPurchased;
    case "price_alert": return prefs.pushPriceAlert;
    case "payment_received":
    case "payment_sent": return prefs.pushPayment;
    default: return false;
  }
}

// Send email notification using the built-in notification API
async function sendEmailNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string
): Promise<boolean> {
  try {
    // Use the built-in notifyOwner for now (can be extended for user emails)
    const content = linkUrl 
      ? `${message}\n\nView details: ${linkUrl}`
      : message;
    
    await notifyOwner({ title, content });
    console.log(`[Notification] Email sent for ${type} to user ${userId}`);
    return true;
  } catch (error) {
    console.error("[Notification] Error sending email:", error);
    return false;
  }
}

// Send push notification
async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Get user's push subscriptions
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));
    
    if (subscriptions.length === 0) {
      console.log(`[Notification] No push subscriptions for user ${userId}`);
      return false;
    }
    
    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        // In a real implementation, you would use web-push library here
        // For now, we'll just log it
        console.log(`[Notification] Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        
        // Update last used
        await db.update(pushSubscriptions)
          .set({ lastUsed: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      } catch (err) {
        console.error(`[Notification] Push failed for subscription ${sub.id}:`, err);
        // Mark as inactive if push fails
        await db.update(pushSubscriptions)
          .set({ isActive: false })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
    
    return true;
  } catch (error) {
    console.error("[Notification] Error sending push:", error);
    return false;
  }
}

// Subscribe to push notifications
export async function subscribeToPush(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if subscription already exists
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);
    
    if (existing) {
      // Update existing subscription
      await db.update(pushSubscriptions)
        .set({ 
          userId, 
          isActive: true, 
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent,
          lastUsed: new Date()
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      // Create new subscription
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent,
      });
    }
    
    // Enable push in preferences
    await updateUserPreferences(userId, { pushEnabled: true });
    
    return true;
  } catch (error) {
    console.error("[Notification] Error subscribing to push:", error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(userId: number, endpoint?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    if (endpoint) {
      // Unsubscribe specific endpoint
      await db.update(pushSubscriptions)
        .set({ isActive: false })
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    } else {
      // Unsubscribe all
      await db.update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.userId, userId));
      
      // Disable push in preferences
      await updateUserPreferences(userId, { pushEnabled: false });
    }
    
    return true;
  } catch (error) {
    console.error("[Notification] Error unsubscribing from push:", error);
    return false;
  }
}

// ==================== Event-based notification triggers ====================

// Notify when NFT is sold
export async function notifyNftSold(params: {
  sellerId: number;
  buyerId: number;
  nftId: number;
  nftName: string;
  price: string;
  currency: string;
}): Promise<void> {
  const { sellerId, buyerId, nftId, nftName, price, currency } = params;
  
  // Notify seller
  await createNotification({
    userId: sellerId,
    type: "nft_sold",
    title: "NFT Sold! 🎉",
    message: `Your NFT "${nftName}" was sold for ${price} ${currency}`,
    linkUrl: `/nft/${nftId}`,
    linkText: "View NFT",
    relatedNftId: nftId,
    metadata: { price, currency, buyerId },
  });
  
  // Notify buyer
  await createNotification({
    userId: buyerId,
    type: "nft_purchased",
    title: "Purchase Complete! 🎨",
    message: `You purchased "${nftName}" for ${price} ${currency}`,
    linkUrl: `/nft/${nftId}`,
    linkText: "View NFT",
    relatedNftId: nftId,
    metadata: { price, currency, sellerId },
  });
}

// Notify when payment is received
export async function notifyPaymentReceived(params: {
  userId: number;
  amount: string;
  currency: string;
  paymentId: number;
  source: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: "payment_received",
    title: "Payment Received! 💰",
    message: `You received ${params.amount} ${params.currency} from ${params.source}`,
    linkUrl: "/payment-history",
    linkText: "View Payment",
    relatedPaymentId: params.paymentId,
    metadata: { amount: params.amount, currency: params.currency, source: params.source },
  });
}

// Notify when article is published
export async function notifyArticlePublished(params: {
  userId: number;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: "article_published",
    title: "Article Published! 📝",
    message: `Your article "${params.articleTitle}" is now live`,
    linkUrl: `/blog/${params.articleSlug}`,
    linkText: "View Article",
    relatedArticleId: params.articleId,
  });
}

// Notify when article is distributed
export async function notifyArticleDistributed(params: {
  userId: number;
  articleId: number;
  articleTitle: string;
  platformCount: number;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: "article_distributed",
    title: "Article Distributed! 🚀",
    message: `Your article "${params.articleTitle}" was distributed to ${params.platformCount} platforms`,
    linkUrl: "/distribution",
    linkText: "View Distribution",
    relatedArticleId: params.articleId,
    metadata: { platformCount: params.platformCount },
  });
}

// Notify price alert
export async function notifyPriceAlert(params: {
  userId: number;
  nftId: number;
  nftName: string;
  oldPrice: string;
  newPrice: string;
  currency: string;
  direction: "up" | "down";
}): Promise<void> {
  const emoji = params.direction === "up" ? "📈" : "📉";
  const action = params.direction === "up" ? "increased" : "decreased";
  
  await createNotification({
    userId: params.userId,
    type: "price_alert",
    title: `Price Alert ${emoji}`,
    message: `"${params.nftName}" price ${action} from ${params.oldPrice} to ${params.newPrice} ${params.currency}`,
    linkUrl: `/nft/${params.nftId}`,
    linkText: "View NFT",
    relatedNftId: params.nftId,
    metadata: { oldPrice: params.oldPrice, newPrice: params.newPrice, direction: params.direction },
  });
}

// Notify new listing
export async function notifyNewListing(params: {
  userId: number;
  nftId: number;
  nftName: string;
  price: string;
  currency: string;
  category?: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: "new_listing",
    title: "New NFT Listed! ✨",
    message: `"${params.nftName}" is now listed for ${params.price} ${params.currency}`,
    linkUrl: `/nft/${params.nftId}`,
    linkText: "View NFT",
    relatedNftId: params.nftId,
    metadata: { price: params.price, currency: params.currency, category: params.category },
  });
}

// System notification
export async function notifySystem(params: {
  userId: number;
  title: string;
  message: string;
  linkUrl?: string;
  linkText?: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: "system",
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
    linkText: params.linkText,
  });
}

console.log("[NotificationService] Service initialized");
