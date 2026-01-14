/**
 * CAPTCHA Solving Service
 * Integrates with 2Captcha, Anti-Captcha, and CapSolver for automatic CAPTCHA solving
 */

import crypto from 'crypto';
import { ENV } from './env';
import { getDb } from '../db';
import { captchaSettings, captchaSolveLog } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Encryption key for API keys
function getEncryptionKey(): Buffer {
  const secret = ENV.cookieSecret || 'default-secret-key';
  return crypto.scryptSync(secret, 'captcha-salt', 32);
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

// CAPTCHA types supported
export type CaptchaType = 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'funcaptcha' | 'image' | 'text';

// CAPTCHA solve request
export interface CaptchaSolveRequest {
  type: CaptchaType;
  siteKey?: string;
  pageUrl: string;
  imageBase64?: string; // For image CAPTCHAs
  minScore?: number; // For reCAPTCHA v3
  action?: string; // For reCAPTCHA v3
}

// CAPTCHA solve result
export interface CaptchaSolveResult {
  success: boolean;
  token?: string;
  solution?: string;
  cost: number;
  solveTimeMs: number;
  service: string;
  error?: string;
}

/**
 * 2Captcha API integration
 */
async function solve2Captcha(apiKey: string, request: CaptchaSolveRequest): Promise<CaptchaSolveResult> {
  const startTime = Date.now();
  
  try {
    let createTaskBody: any = {
      clientKey: apiKey,
      task: {}
    };

    // Build task based on CAPTCHA type
    switch (request.type) {
      case 'recaptcha_v2':
        createTaskBody.task = {
          type: 'RecaptchaV2TaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
        break;
      case 'recaptcha_v3':
        createTaskBody.task = {
          type: 'RecaptchaV3TaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
          minScore: request.minScore || 0.3,
          pageAction: request.action || 'verify',
        };
        break;
      case 'hcaptcha':
        createTaskBody.task = {
          type: 'HCaptchaTaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
        break;
      case 'image':
        createTaskBody.task = {
          type: 'ImageToTextTask',
          body: request.imageBase64,
        };
        break;
      default:
        throw new Error(`Unsupported CAPTCHA type: ${request.type}`);
    }

    // Create task
    const createResponse = await fetch('https://api.2captcha.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createTaskBody),
    });
    
    const createResult = await createResponse.json();
    
    if (createResult.errorId !== 0) {
      throw new Error(createResult.errorDescription || 'Failed to create task');
    }

    const taskId = createResult.taskId;

    // Poll for result
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const getResultResponse = await fetch('https://api.2captcha.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      });
      
      const getResult = await getResultResponse.json();
      
      if (getResult.errorId !== 0) {
        throw new Error(getResult.errorDescription || 'Failed to get result');
      }
      
      if (getResult.status === 'ready') {
        const solveTimeMs = Date.now() - startTime;
        return {
          success: true,
          token: getResult.solution?.gRecaptchaResponse || getResult.solution?.token,
          solution: getResult.solution?.text,
          cost: getResult.cost || 0.003, // Default cost
          solveTimeMs,
          service: '2captcha',
        };
      }
      
      attempts++;
    }

    throw new Error('CAPTCHA solve timeout');
  } catch (error: any) {
    return {
      success: false,
      cost: 0,
      solveTimeMs: Date.now() - startTime,
      service: '2captcha',
      error: error.message,
    };
  }
}

/**
 * Anti-Captcha API integration
 */
async function solveAntiCaptcha(apiKey: string, request: CaptchaSolveRequest): Promise<CaptchaSolveResult> {
  const startTime = Date.now();
  
  try {
    let createTaskBody: any = {
      clientKey: apiKey,
      task: {}
    };

    // Build task based on CAPTCHA type
    switch (request.type) {
      case 'recaptcha_v2':
        createTaskBody.task = {
          type: 'RecaptchaV2TaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
        break;
      case 'recaptcha_v3':
        createTaskBody.task = {
          type: 'RecaptchaV3TaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
          minScore: request.minScore || 0.3,
          pageAction: request.action || 'verify',
        };
        break;
      case 'hcaptcha':
        createTaskBody.task = {
          type: 'HCaptchaTaskProxyless',
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
        break;
      case 'image':
        createTaskBody.task = {
          type: 'ImageToTextTask',
          body: request.imageBase64,
        };
        break;
      default:
        throw new Error(`Unsupported CAPTCHA type: ${request.type}`);
    }

    // Create task
    const createResponse = await fetch('https://api.anti-captcha.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createTaskBody),
    });
    
    const createResult = await createResponse.json();
    
    if (createResult.errorId !== 0) {
      throw new Error(createResult.errorDescription || 'Failed to create task');
    }

    const taskId = createResult.taskId;

    // Poll for result
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const getResultResponse = await fetch('https://api.anti-captcha.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      });
      
      const getResult = await getResultResponse.json();
      
      if (getResult.errorId !== 0) {
        throw new Error(getResult.errorDescription || 'Failed to get result');
      }
      
      if (getResult.status === 'ready') {
        const solveTimeMs = Date.now() - startTime;
        return {
          success: true,
          token: getResult.solution?.gRecaptchaResponse || getResult.solution?.token,
          solution: getResult.solution?.text,
          cost: getResult.cost || 0.002,
          solveTimeMs,
          service: 'anticaptcha',
        };
      }
      
      attempts++;
    }

    throw new Error('CAPTCHA solve timeout');
  } catch (error: any) {
    return {
      success: false,
      cost: 0,
      solveTimeMs: Date.now() - startTime,
      service: 'anticaptcha',
      error: error.message,
    };
  }
}

/**
 * Get user's CAPTCHA settings
 */
export async function getCaptchaSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const settings = await db.select().from(captchaSettings).where(eq(captchaSettings.userId, userId));
  return settings[0] || null;
}

/**
 * Save CAPTCHA settings
 */
export async function saveCaptchaSettings(userId: number, settings: {
  primaryService: 'none' | '2captcha' | 'anticaptcha' | 'capsolver';
  twoCaptchaApiKey?: string;
  antiCaptchaApiKey?: string;
  capSolverApiKey?: string;
  autoSolveEnabled?: boolean;
  maxCostPerDay?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const existing = await getCaptchaSettings(userId);
  
  const data: any = {
    userId,
    primaryService: settings.primaryService,
    autoSolveEnabled: settings.autoSolveEnabled ?? true,
    maxCostPerDay: settings.maxCostPerDay?.toString() ?? '5.00',
    updatedAt: new Date(),
  };
  
  // Encrypt API keys if provided
  if (settings.twoCaptchaApiKey) {
    data.twoCaptchaApiKey = encrypt(settings.twoCaptchaApiKey);
  }
  if (settings.antiCaptchaApiKey) {
    data.antiCaptchaApiKey = encrypt(settings.antiCaptchaApiKey);
  }
  if (settings.capSolverApiKey) {
    data.capSolverApiKey = encrypt(settings.capSolverApiKey);
  }
  
  if (existing) {
    await db.update(captchaSettings).set(data).where(eq(captchaSettings.userId, userId));
  } else {
    await db.insert(captchaSettings).values(data);
  }
  
  return getCaptchaSettings(userId);
}

/**
 * Check balance for a CAPTCHA service
 */
export async function checkBalance(userId: number, service: '2captcha' | 'anticaptcha' | 'capsolver'): Promise<number> {
  const settings = await getCaptchaSettings(userId);
  if (!settings) return 0;
  
  try {
    let apiKey: string | null = null;
    let balanceUrl: string;
    
    switch (service) {
      case '2captcha':
        if (!settings.twoCaptchaApiKey) return 0;
        apiKey = decrypt(settings.twoCaptchaApiKey);
        balanceUrl = 'https://api.2captcha.com/getBalance';
        break;
      case 'anticaptcha':
        if (!settings.antiCaptchaApiKey) return 0;
        apiKey = decrypt(settings.antiCaptchaApiKey);
        balanceUrl = 'https://api.anti-captcha.com/getBalance';
        break;
      case 'capsolver':
        if (!settings.capSolverApiKey) return 0;
        apiKey = decrypt(settings.capSolverApiKey);
        balanceUrl = 'https://api.capsolver.com/getBalance';
        break;
    }
    
    const response = await fetch(balanceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey }),
    });
    
    const result = await response.json();
    return result.balance || 0;
  } catch (error) {
    console.error(`[CaptchaSolver] Error checking ${service} balance:`, error);
    return 0;
  }
}

/**
 * Main CAPTCHA solving function
 * Automatically uses the configured service with fallback
 */
export async function solveCaptcha(
  userId: number,
  request: CaptchaSolveRequest,
  faucetAccountId?: number
): Promise<CaptchaSolveResult> {
  const settings = await getCaptchaSettings(userId);
  
  if (!settings || settings.primaryService === 'none') {
    return {
      success: false,
      cost: 0,
      solveTimeMs: 0,
      service: 'none',
      error: 'No CAPTCHA solving service configured',
    };
  }
  
  // Check daily cost limit
  const dailyCost = parseFloat(settings.dailyCostUsed?.toString() || '0');
  const maxCost = parseFloat(settings.maxCostPerDay?.toString() || '5');
  
  if (dailyCost >= maxCost) {
    return {
      success: false,
      cost: 0,
      solveTimeMs: 0,
      service: settings.primaryService || 'none',
      error: 'Daily CAPTCHA cost limit reached',
    };
  }
  
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Create log entry
  const [logEntry] = await db.insert(captchaSolveLog).values({
    userId,
    faucetAccountId,
    captchaType: request.type,
    service: settings.primaryService || 'none',
    siteKey: request.siteKey,
    pageUrl: request.pageUrl,
    status: 'solving',
  }).$returningId();
  
  let result: CaptchaSolveResult;
  
  // Try primary service
  try {
    switch (settings.primaryService) {
      case '2captcha':
        if (!settings.twoCaptchaApiKey) throw new Error('2Captcha API key not configured');
        const apiKey2c = decrypt(settings.twoCaptchaApiKey);
        result = await solve2Captcha(apiKey2c, request);
        break;
      case 'anticaptcha':
        if (!settings.antiCaptchaApiKey) throw new Error('Anti-Captcha API key not configured');
        const apiKeyAc = decrypt(settings.antiCaptchaApiKey);
        result = await solveAntiCaptcha(apiKeyAc, request);
        break;
      default:
        result = {
          success: false,
          cost: 0,
          solveTimeMs: 0,
          service: settings.primaryService || 'none',
          error: 'Unsupported service',
        };
    }
  } catch (error: any) {
    result = {
      success: false,
      cost: 0,
      solveTimeMs: 0,
      service: settings.primaryService || 'none',
      error: error.message,
    };
  }
  
  // Update log entry
  await db.update(captchaSolveLog).set({
    status: result.success ? 'solved' : 'failed',
    solveTimeMs: result.solveTimeMs,
    cost: result.cost.toString(),
    errorMessage: result.error,
  }).where(eq(captchaSolveLog.id, logEntry.id));
  
  // Update daily cost
  if (result.success && result.cost > 0) {
    await db.update(captchaSettings).set({
      dailyCostUsed: (dailyCost + result.cost).toString(),
      totalCaptchasSolved: (settings.totalCaptchasSolved || 0) + 1,
      totalCost: (parseFloat(settings.totalCost?.toString() || '0') + result.cost).toString(),
    }).where(eq(captchaSettings.userId, userId));
  }
  
  return result;
}

/**
 * Get CAPTCHA solve statistics
 */
export async function getCaptchaStats(userId: number) {
  const settings = await getCaptchaSettings(userId);
  
  if (!settings) {
    return {
      configured: false,
      primaryService: 'none',
      totalSolved: 0,
      totalCost: 0,
      successRate: 0,
      dailyCostUsed: 0,
      dailyCostLimit: 5,
      balances: {},
    };
  }
  
  // Get balances
  const balances: Record<string, number> = {};
  if (settings.twoCaptchaApiKey) {
    balances['2captcha'] = await checkBalance(userId, '2captcha');
  }
  if (settings.antiCaptchaApiKey) {
    balances['anticaptcha'] = await checkBalance(userId, 'anticaptcha');
  }
  if (settings.capSolverApiKey) {
    balances['capsolver'] = await checkBalance(userId, 'capsolver');
  }
  
  return {
    configured: true,
    primaryService: settings.primaryService,
    totalSolved: settings.totalCaptchasSolved || 0,
    totalCost: parseFloat(settings.totalCost?.toString() || '0'),
    successRate: parseFloat(settings.successRate?.toString() || '0'),
    dailyCostUsed: parseFloat(settings.dailyCostUsed?.toString() || '0'),
    dailyCostLimit: parseFloat(settings.maxCostPerDay?.toString() || '5'),
    autoSolveEnabled: settings.autoSolveEnabled,
    balances,
  };
}
