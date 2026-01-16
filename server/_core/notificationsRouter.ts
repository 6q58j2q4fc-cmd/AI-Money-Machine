/**
 * Notifications Router - tRPC endpoints for notification management
 */

import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  updateUserPreferences,
  subscribeToPush,
  unsubscribeFromPush,
  createNotification,
} from "./notificationService";

export const notificationsRouter = router({
  // Get user's notifications
  getNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit, offset, unreadOnly } = input || { limit: 20, offset: 0, unreadOnly: false };
      return await getUserNotifications(ctx.user.id, { limit, offset, unreadOnly });
    }),
  
  // Mark a notification as read
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await markAsRead(input.notificationId, ctx.user.id);
      return { success };
    }),
  
  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const success = await markAllAsRead(ctx.user.id);
      return { success };
    }),
  
  // Delete a notification
  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteNotification(input.notificationId, ctx.user.id);
      return { success };
    }),
  
  // Get notification preferences
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      return await getUserPreferences(ctx.user.id);
    }),
  
  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      // In-app notifications
      inAppEnabled: z.boolean().optional(),
      inAppNftSold: z.boolean().optional(),
      inAppNftPurchased: z.boolean().optional(),
      inAppPriceAlert: z.boolean().optional(),
      inAppNewListing: z.boolean().optional(),
      inAppArticle: z.boolean().optional(),
      inAppPayment: z.boolean().optional(),
      inAppSystem: z.boolean().optional(),
      inAppPromotion: z.boolean().optional(),
      
      // Email notifications
      emailEnabled: z.boolean().optional(),
      emailNftSold: z.boolean().optional(),
      emailNftPurchased: z.boolean().optional(),
      emailPriceAlert: z.boolean().optional(),
      emailNewListing: z.boolean().optional(),
      emailArticle: z.boolean().optional(),
      emailPayment: z.boolean().optional(),
      emailWeeklySummary: z.boolean().optional(),
      
      // Push notifications
      pushEnabled: z.boolean().optional(),
      pushNftSold: z.boolean().optional(),
      pushNftPurchased: z.boolean().optional(),
      pushPriceAlert: z.boolean().optional(),
      pushPayment: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await updateUserPreferences(ctx.user.id, input);
      return { success };
    }),
  
  // Subscribe to push notifications
  subscribePush: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      p256dhKey: z.string(),
      authKey: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await subscribeToPush(
        ctx.user.id,
        { endpoint: input.endpoint, keys: { p256dh: input.p256dhKey, auth: input.authKey } },
        input.userAgent
      );
      return { success };
    }),
  
  // Unsubscribe from push notifications
  unsubscribePush: protectedProcedure
    .input(z.object({
      endpoint: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const success = await unsubscribeFromPush(ctx.user.id, input?.endpoint);
      return { success };
    }),
  
  // Send a test notification (for testing)
  sendTestNotification: protectedProcedure
    .mutation(async ({ ctx }) => {
      const notification = await createNotification({
        userId: ctx.user.id,
        type: "system",
        title: "Test Notification 🔔",
        message: "This is a test notification to verify the notification system is working correctly.",
        linkUrl: "/notifications",
        linkText: "View Settings",
      });
      return { success: !!notification, notification };
    }),
});

export type NotificationsRouter = typeof notificationsRouter;
