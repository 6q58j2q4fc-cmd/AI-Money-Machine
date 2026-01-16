/**
 * Email Notification Service
 * Uses the built-in notification API for owner notifications
 * and can be extended with external email services (SendGrid, Mailgun, etc.)
 */

import { notifyOwner } from "./notification";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Email templates
export type EmailTemplate = 
  | "nft_sold"
  | "nft_purchased"
  | "payment_received"
  | "payment_sent"
  | "article_published"
  | "welcome"
  | "weekly_summary";

interface EmailData {
  to: string;
  toName?: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

// Get user email by ID
async function getUserEmail(userId: number): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user || !user.email || !user.name) return null;
    return { email: user.email, name: user.name };
  } catch (error) {
    console.error("[EmailService] Error getting user email:", error);
    return null;
  }
}

// Generate email HTML from template
function generateEmailHtml(template: EmailTemplate, data: Record<string, unknown>): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #1a1a2e;
    color: #ffffff;
  `;
  
  const buttonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 16px 0;
  `;
  
  const cardStyle = `
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin: 16px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  switch (template) {
    case "nft_sold":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b; margin-bottom: 8px;">🎉 Your NFT Was Sold!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Congratulations on your sale!</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <p style="font-size: 24px; color: #22c55e; margin: 8px 0;">
              ${data.price} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Sold to: ${data.buyerName || 'Anonymous'}
            </p>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">View Transaction</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your NFT Marketplace
          </p>
        </div>
      `;
    
    case "nft_purchased":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b; margin-bottom: 8px;">🎨 Purchase Confirmed!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Your NFT purchase was successful.</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <p style="font-size: 24px; color: #f59e0b; margin: 8px 0;">
              ${data.price} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              From: ${data.sellerName || 'MoneyMachine'}
            </p>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">View Your NFT</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your NFT Marketplace
          </p>
        </div>
      `;
    
    case "payment_received":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #22c55e; margin-bottom: 8px;">💰 Payment Received!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">You've received a payment.</p>
          
          <div style="${cardStyle}">
            <p style="font-size: 32px; color: #22c55e; margin: 8px 0; font-weight: bold;">
              ${data.amount} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Source: ${data.source}
            </p>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">View Payment History</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your NFT Marketplace
          </p>
        </div>
      `;
    
    case "article_published":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b; margin-bottom: 8px;">📝 Article Published!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Your article is now live.</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">${data.articleTitle}</h3>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Published on ${data.publishDate}
            </p>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">View Article</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your Content Platform
          </p>
        </div>
      `;
    
    case "welcome":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b; margin-bottom: 8px;">👋 Welcome to MoneyMachine!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">We're excited to have you on board.</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">Get Started</h3>
            <ul style="color: #a0a0a0; padding-left: 20px;">
              <li>Browse the NFT Marketplace</li>
              <li>Create and list your own NFTs</li>
              <li>Generate AI-powered content</li>
              <li>Earn from affiliate marketing</li>
            </ul>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">Explore Dashboard</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your Content Monetization Platform
          </p>
        </div>
      `;
    
    case "weekly_summary":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b; margin-bottom: 8px;">📊 Your Weekly Summary</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Here's how you did this week.</p>
          
          <div style="${cardStyle}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #a0a0a0;">NFTs Sold</span>
              <span style="color: #22c55e; font-weight: bold;">${data.nftsSold || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #a0a0a0;">Revenue</span>
              <span style="color: #22c55e; font-weight: bold;">${data.revenue || '$0.00'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #a0a0a0;">Articles Published</span>
              <span style="color: #f59e0b; font-weight: bold;">${data.articlesPublished || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #a0a0a0;">Total Views</span>
              <span style="color: #f59e0b; font-weight: bold;">${data.totalViews || 0}</span>
            </div>
          </div>
          
          <a href="${data.linkUrl}" style="${buttonStyle}">View Full Dashboard</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 32px;">
            MoneyMachine - Your Content Monetization Platform
          </p>
        </div>
      `;
    
    default:
      return `
        <div style="${baseStyle}">
          <h1 style="color: #f59e0b;">${data.title || 'Notification'}</h1>
          <p style="color: #a0a0a0;">${data.message || ''}</p>
          ${data.linkUrl ? `<a href="${data.linkUrl}" style="${buttonStyle}">View Details</a>` : ''}
        </div>
      `;
  }
}

// Generate plain text version of email
function generateEmailText(template: EmailTemplate, data: Record<string, unknown>): string {
  switch (template) {
    case "nft_sold":
      return `
🎉 Your NFT Was Sold!

${data.nftName}
Price: ${data.price} ${data.currency}
Sold to: ${data.buyerName || 'Anonymous'}

View Transaction: ${data.linkUrl}

---
MoneyMachine - Your NFT Marketplace
      `.trim();
    
    case "nft_purchased":
      return `
🎨 Purchase Confirmed!

${data.nftName}
Price: ${data.price} ${data.currency}
From: ${data.sellerName || 'MoneyMachine'}

View Your NFT: ${data.linkUrl}

---
MoneyMachine - Your NFT Marketplace
      `.trim();
    
    case "payment_received":
      return `
💰 Payment Received!

Amount: ${data.amount} ${data.currency}
Source: ${data.source}

View Payment History: ${data.linkUrl}

---
MoneyMachine - Your NFT Marketplace
      `.trim();
    
    default:
      return `
${data.title || 'Notification'}

${data.message || ''}

${data.linkUrl ? `View Details: ${data.linkUrl}` : ''}

---
MoneyMachine
      `.trim();
  }
}

// Send email using the built-in notification system (for owner)
// In production, this would use an email service like SendGrid
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    const html = generateEmailHtml(emailData.template, emailData.data);
    const text = generateEmailText(emailData.template, emailData.data);
    
    // For now, use the built-in notifyOwner for all emails
    // In production, integrate with SendGrid, Mailgun, or AWS SES
    const success = await notifyOwner({
      title: emailData.subject,
      content: text,
    });
    
    console.log(`[EmailService] Email sent to ${emailData.to}: ${emailData.subject}`);
    return success;
  } catch (error) {
    console.error("[EmailService] Error sending email:", error);
    return false;
  }
}

// Send email to user by ID
export async function sendEmailToUser(
  userId: number,
  subject: string,
  template: EmailTemplate,
  data: Record<string, unknown>
): Promise<boolean> {
  const user = await getUserEmail(userId);
  if (!user) {
    console.error(`[EmailService] User ${userId} not found`);
    return false;
  }
  
  return sendEmail({
    to: user.email,
    toName: user.name,
    subject,
    template,
    data: { ...data, userName: user.name },
  });
}

// Convenience functions for common email types
export async function sendNftSoldEmail(params: {
  sellerId: number;
  nftName: string;
  price: string;
  currency: string;
  buyerName?: string;
  linkUrl: string;
}): Promise<boolean> {
  return sendEmailToUser(
    params.sellerId,
    `🎉 Your NFT "${params.nftName}" was sold!`,
    "nft_sold",
    params
  );
}

export async function sendNftPurchasedEmail(params: {
  buyerId: number;
  nftName: string;
  price: string;
  currency: string;
  sellerName?: string;
  linkUrl: string;
}): Promise<boolean> {
  return sendEmailToUser(
    params.buyerId,
    `🎨 Purchase confirmed: "${params.nftName}"`,
    "nft_purchased",
    params
  );
}

export async function sendPaymentReceivedEmail(params: {
  userId: number;
  amount: string;
  currency: string;
  source: string;
  linkUrl: string;
}): Promise<boolean> {
  return sendEmailToUser(
    params.userId,
    `💰 Payment received: ${params.amount} ${params.currency}`,
    "payment_received",
    params
  );
}

export async function sendWelcomeEmail(userId: number, linkUrl: string): Promise<boolean> {
  return sendEmailToUser(
    userId,
    "👋 Welcome to MoneyMachine!",
    "welcome",
    { linkUrl }
  );
}

export async function sendWeeklySummaryEmail(params: {
  userId: number;
  nftsSold: number;
  revenue: string;
  articlesPublished: number;
  totalViews: number;
  linkUrl: string;
}): Promise<boolean> {
  return sendEmailToUser(
    params.userId,
    "📊 Your Weekly MoneyMachine Summary",
    "weekly_summary",
    params
  );
}

console.log("[EmailService] Service initialized");
