/**
 * Email Notification Service
 * Supports SendGrid, Mailgun, and built-in notification API
 */

import { notifyOwner } from "./notification";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "builtin"; // "sendgrid" | "mailgun" | "builtin"
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || "";
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@moneymachine.app";
const FROM_NAME = process.env.FROM_NAME || "MoneyMachine";

// Email templates
export type EmailTemplate = 
  | "nft_sold"
  | "nft_purchased"
  | "payment_received"
  | "payment_sent"
  | "article_published"
  | "welcome"
  | "weekly_summary"
  | "price_alert"
  | "new_listing";

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
  
  const headerHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://moneymachine.app/logo.png" alt="MoneyMachine" style="height: 40px; margin-bottom: 16px;" />
    </div>
  `;
  
  const footerHtml = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        MoneyMachine - Your Content Monetization Platform
      </p>
      <p style="color: #666; font-size: 11px; margin: 8px 0 0 0;">
        <a href="${data.unsubscribeUrl || '#'}" style="color: #666;">Unsubscribe</a> | 
        <a href="${data.preferencesUrl || '/notifications'}" style="color: #666;">Notification Settings</a>
      </p>
    </div>
  `;
  
  switch (template) {
    case "nft_sold":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">🎉 Your NFT Was Sold!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Congratulations on your sale!</p>
          
          <div style="${cardStyle}">
            ${data.nftImage ? `<img src="${data.nftImage}" alt="${data.nftName}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />` : ''}
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <p style="font-size: 24px; color: #22c55e; margin: 8px 0;">
              ${data.price} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Sold to: ${data.buyerName || 'Anonymous'}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View Transaction</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "nft_purchased":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">🎨 Purchase Confirmed!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Your NFT purchase was successful.</p>
          
          <div style="${cardStyle}">
            ${data.nftImage ? `<img src="${data.nftImage}" alt="${data.nftName}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />` : ''}
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <p style="font-size: 24px; color: #f59e0b; margin: 8px 0;">
              ${data.price} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              From: ${data.sellerName || 'MoneyMachine'}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View Your NFT</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "payment_received":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #22c55e; margin-bottom: 8px;">💰 Payment Received!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">You've received a payment.</p>
          
          <div style="${cardStyle}">
            <p style="font-size: 32px; color: #22c55e; margin: 8px 0; font-weight: bold; text-align: center;">
              ${data.amount} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0; text-align: center;">
              Source: ${data.source}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View Payment History</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "price_alert":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: ${data.direction === 'up' ? '#22c55e' : '#ef4444'}; margin-bottom: 8px;">
            ${data.direction === 'up' ? '📈' : '📉'} Price Alert
          </h1>
          <p style="color: #a0a0a0; margin-top: 0;">An NFT you're watching has changed price.</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666; text-decoration: line-through;">${data.oldPrice} ${data.currency}</span>
              <span style="font-size: 20px;">→</span>
              <span style="font-size: 24px; color: ${data.direction === 'up' ? '#22c55e' : '#ef4444'}; font-weight: bold;">
                ${data.newPrice} ${data.currency}
              </span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View NFT</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "new_listing":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">✨ New NFT Listed!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">A new NFT matching your interests is now available.</p>
          
          <div style="${cardStyle}">
            ${data.nftImage ? `<img src="${data.nftImage}" alt="${data.nftName}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />` : ''}
            <h3 style="margin-top: 0; color: #fff;">${data.nftName}</h3>
            <p style="font-size: 24px; color: #f59e0b; margin: 8px 0;">
              ${data.price} ${data.currency}
            </p>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              By: ${data.creatorName || 'Unknown Artist'}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View NFT</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "article_published":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">📝 Article Published!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Your article is now live.</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">${data.articleTitle}</h3>
            <p style="color: #a0a0a0; margin-bottom: 0;">
              Published on ${data.publishDate}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View Article</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "welcome":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">👋 Welcome to MoneyMachine!</h1>
          <p style="color: #a0a0a0; margin-top: 0;">We're excited to have you on board, ${data.userName || 'there'}!</p>
          
          <div style="${cardStyle}">
            <h3 style="margin-top: 0; color: #fff;">Get Started</h3>
            <ul style="color: #a0a0a0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Browse the NFT Marketplace</li>
              <li style="margin-bottom: 8px;">Create and list your own NFTs</li>
              <li style="margin-bottom: 8px;">Generate AI-powered content</li>
              <li>Earn from affiliate marketing</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">Explore Dashboard</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    case "weekly_summary":
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b; margin-bottom: 8px;">📊 Your Weekly Summary</h1>
          <p style="color: #a0a0a0; margin-top: 0;">Here's how you did this week.</p>
          
          <div style="${cardStyle}">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #a0a0a0;">NFTs Sold</td>
                <td style="padding: 8px 0; color: #22c55e; font-weight: bold; text-align: right;">${data.nftsSold || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a0a0a0;">Revenue</td>
                <td style="padding: 8px 0; color: #22c55e; font-weight: bold; text-align: right;">${data.revenue || '$0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a0a0a0;">Articles Published</td>
                <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-align: right;">${data.articlesPublished || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a0a0a0;">Total Views</td>
                <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-align: right;">${data.totalViews || 0}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.linkUrl}" style="${buttonStyle}">View Full Dashboard</a>
          </div>
          
          ${footerHtml}
        </div>
      `;
    
    default:
      return `
        <div style="${baseStyle}">
          ${headerHtml}
          <h1 style="color: #f59e0b;">${data.title || 'Notification'}</h1>
          <p style="color: #a0a0a0;">${data.message || ''}</p>
          ${data.linkUrl ? `<div style="text-align: center;"><a href="${data.linkUrl}" style="${buttonStyle}">View Details</a></div>` : ''}
          ${footerHtml}
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
    
    case "price_alert":
      return `
${data.direction === 'up' ? '📈' : '📉'} Price Alert

${data.nftName}
Old Price: ${data.oldPrice} ${data.currency}
New Price: ${data.newPrice} ${data.currency}

View NFT: ${data.linkUrl}

---
MoneyMachine
      `.trim();
    
    case "new_listing":
      return `
✨ New NFT Listed!

${data.nftName}
Price: ${data.price} ${data.currency}
By: ${data.creatorName || 'Unknown Artist'}

View NFT: ${data.linkUrl}

---
MoneyMachine
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

// Send email via SendGrid
async function sendViaSendGrid(emailData: EmailData, html: string, text: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("[EmailService] SendGrid API key not configured");
    return false;
  }
  
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.to, name: emailData.toName }],
        }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: emailData.subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[EmailService] SendGrid error:", error);
      return false;
    }
    
    console.log(`[EmailService] Email sent via SendGrid to ${emailData.to}`);
    return true;
  } catch (error) {
    console.error("[EmailService] SendGrid error:", error);
    return false;
  }
}

// Send email via Mailgun
async function sendViaMailgun(emailData: EmailData, html: string, text: string): Promise<boolean> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.error("[EmailService] Mailgun credentials not configured");
    return false;
  }
  
  try {
    const formData = new FormData();
    formData.append("from", `${FROM_NAME} <${FROM_EMAIL}>`);
    formData.append("to", emailData.toName ? `${emailData.toName} <${emailData.to}>` : emailData.to);
    formData.append("subject", emailData.subject);
    formData.append("text", text);
    formData.append("html", html);
    
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[EmailService] Mailgun error:", error);
      return false;
    }
    
    console.log(`[EmailService] Email sent via Mailgun to ${emailData.to}`);
    return true;
  } catch (error) {
    console.error("[EmailService] Mailgun error:", error);
    return false;
  }
}

// Send email using the built-in notification system (for owner)
async function sendViaBuiltin(emailData: EmailData, text: string): Promise<boolean> {
  try {
    const success = await notifyOwner({
      title: emailData.subject,
      content: `To: ${emailData.to}\n\n${text}`,
    });
    
    console.log(`[EmailService] Email notification sent via builtin for ${emailData.to}`);
    return success;
  } catch (error) {
    console.error("[EmailService] Builtin notification error:", error);
    return false;
  }
}

// Main send email function
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    const html = generateEmailHtml(emailData.template, emailData.data);
    const text = generateEmailText(emailData.template, emailData.data);
    
    switch (EMAIL_PROVIDER) {
      case "sendgrid":
        return await sendViaSendGrid(emailData, html, text);
      case "mailgun":
        return await sendViaMailgun(emailData, html, text);
      case "builtin":
      default:
        return await sendViaBuiltin(emailData, text);
    }
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
  nftImage?: string;
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
  nftImage?: string;
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

export async function sendPriceAlertEmail(params: {
  userId: number;
  nftName: string;
  oldPrice: string;
  newPrice: string;
  currency: string;
  direction: "up" | "down";
  linkUrl: string;
}): Promise<boolean> {
  const emoji = params.direction === "up" ? "📈" : "📉";
  return sendEmailToUser(
    params.userId,
    `${emoji} Price Alert: "${params.nftName}"`,
    "price_alert",
    params
  );
}

export async function sendNewListingEmail(params: {
  userId: number;
  nftName: string;
  nftImage?: string;
  price: string;
  currency: string;
  creatorName?: string;
  linkUrl: string;
}): Promise<boolean> {
  return sendEmailToUser(
    params.userId,
    `✨ New NFT Listed: "${params.nftName}"`,
    "new_listing",
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

// Check if email service is configured
export function isEmailConfigured(): boolean {
  switch (EMAIL_PROVIDER) {
    case "sendgrid":
      return !!SENDGRID_API_KEY;
    case "mailgun":
      return !!(MAILGUN_API_KEY && MAILGUN_DOMAIN);
    case "builtin":
    default:
      return true;
  }
}

console.log(`[EmailService] Service initialized with provider: ${EMAIL_PROVIDER}`);
console.log(`[EmailService] Email configured: ${isEmailConfigured()}`);
