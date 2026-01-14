/**
 * Faucet Account Management Service
 * Manages credentials for crypto faucet sites with encrypted storage
 */

import crypto from 'crypto';
import { ENV } from './env';
import { getDb } from '../db';
import { faucetAccounts, faucetClaimLog } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

// Encryption key for credentials
function getEncryptionKey(): Buffer {
  const secret = ENV.cookieSecret || 'default-secret-key';
  return crypto.scryptSync(secret, 'faucet-salt', 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return JSON.stringify({ iv: iv.toString('hex'), encrypted, authTag: authTag.toString('hex') });
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const { iv, encrypted, authTag } = JSON.parse(encryptedData);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Supported faucet platforms
export const FAUCET_PLATFORMS = [
  {
    id: 'freebitcoin',
    name: 'FreeBitco.in',
    url: 'https://freebitco.in',
    icon: '₿',
    currency: 'BTC',
    claimInterval: 60, // minutes
    requiresCaptcha: true,
    captchaType: 'recaptcha_v2' as const,
  },
  {
    id: 'cointiply',
    name: 'Cointiply',
    url: 'https://cointiply.com',
    icon: '🪙',
    currency: 'BTC',
    claimInterval: 60,
    requiresCaptcha: true,
    captchaType: 'hcaptcha' as const,
  },
  {
    id: 'faucetpay',
    name: 'FaucetPay',
    url: 'https://faucetpay.io',
    icon: '💰',
    currency: 'Multi',
    claimInterval: 60,
    requiresCaptcha: true,
    captchaType: 'hcaptcha' as const,
  },
  {
    id: 'firefaucet',
    name: 'FireFaucet',
    url: 'https://firefaucet.win',
    icon: '🔥',
    currency: 'Multi',
    claimInterval: 30,
    requiresCaptcha: true,
    captchaType: 'recaptcha_v2' as const,
  },
  {
    id: 'faucetcrypto',
    name: 'FaucetCrypto',
    url: 'https://faucetcrypto.com',
    icon: '🎰',
    currency: 'Multi',
    claimInterval: 40,
    requiresCaptcha: true,
    captchaType: 'hcaptcha' as const,
  },
  {
    id: 'dutchycorp',
    name: 'DutchyCorp',
    url: 'https://autofaucet.dutchycorp.space',
    icon: '🌷',
    currency: 'Multi',
    claimInterval: 30,
    requiresCaptcha: true,
    captchaType: 'hcaptcha' as const,
  },
  {
    id: 'allcoins',
    name: 'Allcoins.pw',
    url: 'https://allcoins.pw',
    icon: '💎',
    currency: 'Multi',
    claimInterval: 5,
    requiresCaptcha: true,
    captchaType: 'recaptcha_v2' as const,
  },
  {
    id: 'claimfreecoins',
    name: 'ClaimFreeCoins',
    url: 'https://claimfreecoins.io',
    icon: '🎁',
    currency: 'Multi',
    claimInterval: 60,
    requiresCaptcha: true,
    captchaType: 'hcaptcha' as const,
  },
];

// Faucet account interface
export interface FaucetAccountData {
  id: number;
  platform: string;
  platformUrl: string;
  platformIcon: string;
  email?: string;
  walletAddress?: string;
  loginStatus: string;
  lastClaimAt?: Date;
  nextClaimAt?: Date;
  totalClaims: number;
  totalEarnings: string;
  earningsCurrency: string;
  isEnabled: boolean;
  errorMessage?: string;
}

/**
 * Get all faucet accounts for a user
 */
export async function getFaucetAccounts(userId: number): Promise<FaucetAccountData[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const accounts = await db.select().from(faucetAccounts)
    .where(eq(faucetAccounts.userId, userId))
    .orderBy(desc(faucetAccounts.createdAt));
  
  return accounts.map(acc => ({
    id: acc.id,
    platform: acc.platform,
    platformUrl: acc.platformUrl || '',
    platformIcon: acc.platformIcon || '🪙',
    email: acc.encryptedEmail ? decrypt(acc.encryptedEmail) : undefined,
    walletAddress: acc.walletAddress || undefined,
    loginStatus: acc.loginStatus || 'logged_out',
    lastClaimAt: acc.lastClaimAt || undefined,
    nextClaimAt: acc.nextClaimAt || undefined,
    totalClaims: acc.totalClaims || 0,
    totalEarnings: acc.totalEarnings?.toString() || '0',
    earningsCurrency: acc.earningsCurrency || 'BTC',
    isEnabled: acc.isEnabled ?? true,
    errorMessage: acc.errorMessage || undefined,
  }));
}

/**
 * Add a new faucet account
 */
export async function addFaucetAccount(userId: number, data: {
  platform: string;
  email: string;
  password: string;
  walletAddress?: string;
}): Promise<FaucetAccountData> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const platformInfo = FAUCET_PLATFORMS.find(p => p.id === data.platform);
  if (!platformInfo) {
    throw new Error(`Unknown platform: ${data.platform}`);
  }
  
  const [result] = await db.insert(faucetAccounts).values({
    userId,
    platform: data.platform,
    platformUrl: platformInfo.url,
    platformIcon: platformInfo.icon,
    encryptedEmail: encrypt(data.email),
    encryptedPassword: encrypt(data.password),
    walletAddress: data.walletAddress,
    claimIntervalMinutes: platformInfo.claimInterval,
    earningsCurrency: platformInfo.currency,
    loginStatus: 'logged_out',
    isEnabled: true,
  }).$returningId();
  
  const accounts = await getFaucetAccounts(userId);
  return accounts.find(a => a.id === result.id)!;
}

/**
 * Update a faucet account
 */
export async function updateFaucetAccount(userId: number, accountId: number, data: {
  email?: string;
  password?: string;
  walletAddress?: string;
  isEnabled?: boolean;
}): Promise<FaucetAccountData | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: any = { updatedAt: new Date() };
  
  if (data.email) updateData.encryptedEmail = encrypt(data.email);
  if (data.password) updateData.encryptedPassword = encrypt(data.password);
  if (data.walletAddress !== undefined) updateData.walletAddress = data.walletAddress;
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
  
  await db.update(faucetAccounts)
    .set(updateData)
    .where(and(eq(faucetAccounts.id, accountId), eq(faucetAccounts.userId, userId)));
  
  const accounts = await getFaucetAccounts(userId);
  return accounts.find(a => a.id === accountId) || null;
}

/**
 * Delete a faucet account
 */
export async function deleteFaucetAccount(userId: number, accountId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.delete(faucetAccounts)
    .where(and(eq(faucetAccounts.id, accountId), eq(faucetAccounts.userId, userId)));
  
  return true;
}

/**
 * Get decrypted credentials for a faucet account (for automation)
 */
export async function getAccountCredentials(userId: number, accountId: number): Promise<{
  email: string;
  password: string;
  sessionCookies?: string;
} | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [account] = await db.select().from(faucetAccounts)
    .where(and(eq(faucetAccounts.id, accountId), eq(faucetAccounts.userId, userId)));
  
  if (!account || !account.encryptedEmail || !account.encryptedPassword) {
    return null;
  }
  
  return {
    email: decrypt(account.encryptedEmail),
    password: decrypt(account.encryptedPassword),
    sessionCookies: account.sessionCookies ? decrypt(account.sessionCookies) : undefined,
  };
}

/**
 * Update login status and session cookies
 */
export async function updateLoginStatus(
  accountId: number,
  status: 'logged_out' | 'logged_in' | 'expired' | 'error',
  sessionCookies?: string,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: any = {
    loginStatus: status,
    updatedAt: new Date(),
  };
  
  if (status === 'logged_in') {
    updateData.lastLoginAt = new Date();
    updateData.errorMessage = null;
  }
  
  if (sessionCookies) {
    updateData.sessionCookies = encrypt(sessionCookies);
  }
  
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  
  await db.update(faucetAccounts)
    .set(updateData)
    .where(eq(faucetAccounts.id, accountId));
}

/**
 * Record a claim attempt
 */
export async function recordClaim(
  userId: number,
  accountId: number,
  data: {
    platform: string;
    status: 'pending' | 'claiming' | 'success' | 'failed' | 'captcha_failed';
    claimAmount?: string;
    currency?: string;
    usdValue?: number;
    captchaRequired?: boolean;
    captchaSolveLogId?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.insert(faucetClaimLog).values({
    userId,
    faucetAccountId: accountId,
    platform: data.platform,
    status: data.status,
    claimAmount: data.claimAmount,
    currency: data.currency,
    usdValue: data.usdValue?.toString(),
    captchaRequired: data.captchaRequired,
    captchaSolveLogId: data.captchaSolveLogId,
    errorMessage: data.errorMessage,
    claimedAt: data.status === 'success' ? new Date() : undefined,
  });
  
  // Update account stats if successful
  if (data.status === 'success') {
    const [account] = await db.select().from(faucetAccounts)
      .where(eq(faucetAccounts.id, accountId));
    
    if (account) {
      const platformInfo = FAUCET_PLATFORMS.find(p => p.id === account.platform);
      const nextClaimAt = new Date(Date.now() + (platformInfo?.claimInterval || 60) * 60 * 1000);
      
      const currentEarnings = parseFloat(account.totalEarnings?.toString() || '0');
      const newEarnings = currentEarnings + parseFloat(data.claimAmount || '0');
      
      await db.update(faucetAccounts).set({
        lastClaimAt: new Date(),
        nextClaimAt,
        totalClaims: (account.totalClaims || 0) + 1,
        totalEarnings: newEarnings.toString(),
        errorMessage: null,
        updatedAt: new Date(),
      }).where(eq(faucetAccounts.id, accountId));
    }
  }
}

/**
 * Get claim history for a user
 */
export async function getClaimHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const claims = await db.select().from(faucetClaimLog)
    .where(eq(faucetClaimLog.userId, userId))
    .orderBy(desc(faucetClaimLog.createdAt))
    .limit(limit);
  
  return claims;
}

/**
 * Get accounts that are ready to claim
 */
export async function getReadyToClaim(userId: number): Promise<FaucetAccountData[]> {
  const accounts = await getFaucetAccounts(userId);
  const now = new Date();
  
  return accounts.filter(acc => {
    if (!acc.isEnabled) return false;
    if (acc.loginStatus !== 'logged_in') return false;
    if (!acc.nextClaimAt) return true; // Never claimed
    return new Date(acc.nextClaimAt) <= now;
  });
}

/**
 * Get faucet statistics
 */
export async function getFaucetStats(userId: number) {
  const accounts = await getFaucetAccounts(userId);
  const claims = await getClaimHistory(userId, 1000);
  
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.isEnabled && a.loginStatus === 'logged_in').length;
  const totalClaims = claims.length;
  const successfulClaims = claims.filter(c => c.status === 'success').length;
  const failedClaims = claims.filter(c => c.status === 'failed' || c.status === 'captcha_failed').length;
  
  // Calculate total earnings by currency
  const earningsByCurrency: Record<string, number> = {};
  for (const acc of accounts) {
    const currency = acc.earningsCurrency;
    const amount = parseFloat(acc.totalEarnings);
    earningsByCurrency[currency] = (earningsByCurrency[currency] || 0) + amount;
  }
  
  return {
    totalAccounts,
    activeAccounts,
    totalClaims,
    successfulClaims,
    failedClaims,
    successRate: totalClaims > 0 ? (successfulClaims / totalClaims * 100).toFixed(1) : '0',
    earningsByCurrency,
    platforms: FAUCET_PLATFORMS,
  };
}
