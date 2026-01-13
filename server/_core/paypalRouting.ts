/**
 * PayPal Payment Routing System
 * Automatically routes all non-affiliate income to the owner's PayPal account
 */

import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import { logEvent } from "./hiveMind";

// Owner's PayPal configuration
const OWNER_PAYPAL = 'dakotarea@icloud.com';
const OWNER_NAME = 'Dakota Rea';

// Income sources that can route to PayPal
export const PAYPAL_COMPATIBLE_SOURCES = [
  // Direct PayPal payments
  { id: 'buymeacoffee', name: 'Buy Me a Coffee', type: 'tips', setupUrl: 'https://buymeacoffee.com' },
  { id: 'kofi', name: 'Ko-fi', type: 'tips', setupUrl: 'https://ko-fi.com' },
  { id: 'paypal_me', name: 'PayPal.Me', type: 'direct', setupUrl: 'https://paypal.me' },
  
  // Ad networks with PayPal payout
  { id: 'ezoic', name: 'Ezoic', type: 'ads', setupUrl: 'https://ezoic.com', minPayout: 20 },
  { id: 'mediavine', name: 'Mediavine', type: 'ads', setupUrl: 'https://mediavine.com', minPayout: 25 },
  
  // Link monetization
  { id: 'shorte_st', name: 'Shorte.st', type: 'links', setupUrl: 'https://shorte.st', minPayout: 5 },
  { id: 'adf_ly', name: 'Adf.ly', type: 'links', setupUrl: 'https://adf.ly', minPayout: 5 },
  { id: 'linkvertise', name: 'Linkvertise', type: 'links', setupUrl: 'https://linkvertise.com', minPayout: 5 },
  
  // Content monetization
  { id: 'vocal', name: 'Vocal Media', type: 'content', setupUrl: 'https://vocal.media', minPayout: 35 },
  { id: 'newsbreak', name: 'NewsBreak', type: 'content', setupUrl: 'https://newsbreak.com', minPayout: 50 },
  { id: 'medium', name: 'Medium Partner', type: 'content', setupUrl: 'https://medium.com/creators', minPayout: 10 },
  
  // Sponsored content
  { id: 'cooperatize', name: 'Cooperatize', type: 'sponsored', setupUrl: 'https://cooperatize.com', minPayout: 50 },
  { id: 'izea', name: 'IZEA', type: 'sponsored', setupUrl: 'https://izea.com', minPayout: 50 },
  
  // Affiliate networks with PayPal
  { id: 'shareasale', name: 'ShareASale', type: 'affiliate', setupUrl: 'https://shareasale.com', minPayout: 50 },
  { id: 'clickbank', name: 'ClickBank', type: 'affiliate', setupUrl: 'https://clickbank.com', minPayout: 10 },
  { id: 'cj', name: 'Commission Junction', type: 'affiliate', setupUrl: 'https://cj.com', minPayout: 50 },
  { id: 'rakuten', name: 'Rakuten', type: 'affiliate', setupUrl: 'https://rakutenadvertising.com', minPayout: 50 },
];

interface PaymentConfig {
  sourceId: string;
  paypalEmail: string;
  isActive: boolean;
  lastPayout: Date | null;
  totalEarned: number;
  pendingAmount: number;
}

interface IncomeRecord {
  sourceId: string;
  sourceName: string;
  amount: number;
  currency: string;
  date: Date;
  status: 'pending' | 'paid' | 'processing';
  paypalTransactionId?: string;
}

// In-memory store for payment configurations (would be in DB in production)
const paymentConfigs: Map<string, PaymentConfig> = new Map();
const incomeRecords: IncomeRecord[] = [];

/**
 * Get the owner's PayPal configuration
 */
export function getPayPalConfig() {
  return {
    email: OWNER_PAYPAL,
    ownerName: OWNER_NAME,
    isConfigured: true,
    compatibleSources: PAYPAL_COMPATIBLE_SOURCES,
    activeSourcesCount: Array.from(paymentConfigs.values()).filter(c => c.isActive).length,
    totalEarnings: Array.from(paymentConfigs.values()).reduce((sum, c) => sum + c.totalEarned, 0),
    pendingPayouts: Array.from(paymentConfigs.values()).reduce((sum, c) => sum + c.pendingAmount, 0),
  };
}

/**
 * Setup PayPal routing for a specific income source
 */
export async function setupPayPalForSource(sourceId: string): Promise<{
  success: boolean;
  message: string;
  setupUrl?: string;
  instructions?: string[];
}> {
  const source = PAYPAL_COMPATIBLE_SOURCES.find(s => s.id === sourceId);
  
  if (!source) {
    return { success: false, message: 'Income source not found' };
  }
  
  // Create or update payment config
  paymentConfigs.set(sourceId, {
    sourceId,
    paypalEmail: OWNER_PAYPAL,
    isActive: true,
    lastPayout: null,
    totalEarned: 0,
    pendingAmount: 0,
  });
  
  await logEvent(0, 'system_event', { 
    message: `PayPal routing configured for ${source.name} → ${OWNER_PAYPAL}` 
  });
  
  const instructions = getSetupInstructions(source);
  
  return {
    success: true,
    message: `PayPal routing configured for ${source.name}`,
    setupUrl: source.setupUrl,
    instructions,
  };
}

/**
 * Get setup instructions for each income source
 */
function getSetupInstructions(source: typeof PAYPAL_COMPATIBLE_SOURCES[0]): string[] {
  const baseInstructions = [
    `1. Go to ${source.setupUrl}`,
    `2. Create an account or log in`,
    `3. Navigate to Payment Settings or Payout Settings`,
    `4. Select PayPal as your payout method`,
    `5. Enter your PayPal email: ${OWNER_PAYPAL}`,
    `6. Verify your email if required`,
  ];
  
  switch (source.type) {
    case 'tips':
      return [
        ...baseInstructions,
        `7. Customize your ${source.name} page with your branding`,
        `8. Add the widget/button to your articles`,
        `9. Share your ${source.name} link on social media`,
      ];
    case 'ads':
      return [
        ...baseInstructions,
        `7. Add your website for approval`,
        `8. Install the ad code on your pages`,
        `9. Wait for approval (usually 24-48 hours)`,
        `10. Minimum payout: $${source.minPayout || 'varies'}`,
      ];
    case 'links':
      return [
        ...baseInstructions,
        `7. Get your API key from the dashboard`,
        `8. Use shortened links in your articles`,
        `9. Minimum payout: $${source.minPayout || 5}`,
      ];
    case 'content':
      return [
        ...baseInstructions,
        `7. Apply for the creator/partner program`,
        `8. Publish quality content regularly`,
        `9. Minimum payout: $${source.minPayout || 'varies'}`,
      ];
    case 'affiliate':
      return [
        ...baseInstructions,
        `7. Apply to affiliate programs`,
        `8. Get approved by advertisers`,
        `9. Add affiliate links to your content`,
        `10. Minimum payout: $${source.minPayout || 50}`,
      ];
    default:
      return baseInstructions;
  }
}

/**
 * Record income from a source
 */
export async function recordIncome(
  sourceId: string,
  amount: number,
  currency: string = 'USD'
): Promise<boolean> {
  const source = PAYPAL_COMPATIBLE_SOURCES.find(s => s.id === sourceId);
  if (!source) return false;
  
  const record: IncomeRecord = {
    sourceId,
    sourceName: source.name,
    amount,
    currency,
    date: new Date(),
    status: 'pending',
  };
  
  incomeRecords.push(record);
  
  // Update payment config
  const config = paymentConfigs.get(sourceId);
  if (config) {
    config.pendingAmount += amount;
    config.totalEarned += amount;
  }
  
  await logEvent(0, 'system_event', { 
    message: `Income recorded: $${amount} from ${source.name}`,
    metadata: { sourceId, amount, currency }
  });
  
  return true;
}

/**
 * Get all income records
 */
export function getIncomeRecords(): IncomeRecord[] {
  return [...incomeRecords].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Get income summary by source
 */
export function getIncomeSummary(): {
  totalEarned: number;
  pendingPayouts: number;
  bySource: Array<{
    sourceId: string;
    sourceName: string;
    totalEarned: number;
    pendingAmount: number;
    lastPayout: Date | null;
  }>;
} {
  const bySource = Array.from(paymentConfigs.entries()).map(([id, config]) => {
    const source = PAYPAL_COMPATIBLE_SOURCES.find(s => s.id === id);
    return {
      sourceId: id,
      sourceName: source?.name || id,
      totalEarned: config.totalEarned,
      pendingAmount: config.pendingAmount,
      lastPayout: config.lastPayout,
    };
  });
  
  return {
    totalEarned: bySource.reduce((sum, s) => sum + s.totalEarned, 0),
    pendingPayouts: bySource.reduce((sum, s) => sum + s.pendingAmount, 0),
    bySource,
  };
}

/**
 * Auto-setup all PayPal-compatible sources
 */
export async function autoSetupAllSources(): Promise<{
  setupCount: number;
  sources: Array<{ name: string; setupUrl: string }>;
}> {
  const sources: Array<{ name: string; setupUrl: string }> = [];
  
  for (const source of PAYPAL_COMPATIBLE_SOURCES) {
    if (!paymentConfigs.has(source.id)) {
      await setupPayPalForSource(source.id);
      sources.push({ name: source.name, setupUrl: source.setupUrl });
    }
  }
  
  await logEvent(0, 'system_event', { 
    message: `Auto-setup PayPal routing for ${sources.length} income sources` 
  });
  
  return {
    setupCount: sources.length,
    sources,
  };
}

/**
 * Generate PayPal.Me link for direct tips
 */
export function getPayPalMeLink(amount?: number): string {
  const baseUrl = `https://paypal.me/dakotarea`;
  return amount ? `${baseUrl}/${amount}` : baseUrl;
}

/**
 * Generate tip button HTML for articles
 */
export function generateTipButtonHtml(): string {
  return `
<div style="text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
  <p style="color: white; margin-bottom: 15px; font-size: 16px;">
    💰 Found this helpful? Support the creator!
  </p>
  <a href="${getPayPalMeLink()}" target="_blank" rel="noopener" 
     style="display: inline-block; background: #ffc439; color: #003087; padding: 12px 24px; 
            border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">
    ☕ Buy Me a Coffee via PayPal
  </a>
  <p style="color: rgba(255,255,255,0.8); margin-top: 10px; font-size: 12px;">
    Payments go to: ${OWNER_PAYPAL}
  </p>
</div>
  `.trim();
}

/**
 * Get all monetization opportunities with PayPal support
 */
export function getPayPalMonetizationOpportunities(): {
  immediate: typeof PAYPAL_COMPATIBLE_SOURCES;
  requiresTraffic: typeof PAYPAL_COMPATIBLE_SOURCES;
  configured: string[];
} {
  const configured = Array.from(paymentConfigs.keys());
  
  // Immediate opportunities (no traffic requirements)
  const immediate = PAYPAL_COMPATIBLE_SOURCES.filter(s => 
    s.type === 'tips' || s.type === 'direct' || s.type === 'links'
  );
  
  // Require traffic/approval
  const requiresTraffic = PAYPAL_COMPATIBLE_SOURCES.filter(s =>
    s.type === 'ads' || s.type === 'content' || s.type === 'sponsored'
  );
  
  return { immediate, requiresTraffic, configured };
}
