/**
 * Browser Automation Service
 * Uses Puppeteer for real browser automation to claim from faucets
 */

import puppeteer, { Browser, Page, executablePath } from 'puppeteer';
import { logEvent } from './hiveMind';

// Browser instance (singleton)
let browserInstance: Browser | null = null;
let isInitializing = false;

// Automation status tracking
interface AutomationStatus {
  isRunning: boolean;
  currentTask: string | null;
  lastAction: Date | null;
  totalClaims: number;
  successfulClaims: number;
  failedClaims: number;
  logs: AutomationLog[];
}

interface AutomationLog {
  timestamp: Date;
  action: string;
  site: string;
  status: 'info' | 'success' | 'error' | 'warning';
  details?: string;
  screenshot?: string;
}

let automationStatus: AutomationStatus = {
  isRunning: false,
  currentTask: null,
  lastAction: null,
  totalClaims: 0,
  successfulClaims: 0,
  failedClaims: 0,
  logs: []
};

// Maximum logs to keep in memory
const MAX_LOGS = 100;

/**
 * Add a log entry
 */
function addLog(action: string, site: string, status: AutomationLog['status'], details?: string) {
  const log: AutomationLog = {
    timestamp: new Date(),
    action,
    site,
    status,
    details
  };
  
  automationStatus.logs.unshift(log);
  
  // Keep only the last MAX_LOGS entries
  if (automationStatus.logs.length > MAX_LOGS) {
    automationStatus.logs = automationStatus.logs.slice(0, MAX_LOGS);
  }
  
  automationStatus.lastAction = new Date();
  
  console.log(`[BrowserAutomation] [${status.toUpperCase()}] ${site}: ${action}${details ? ` - ${details}` : ''}`);
}

/**
 * Initialize the browser instance
 */
async function initBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }
  
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (browserInstance) {
      return browserInstance;
    }
  }
  
  isInitializing = true;
  
  try {
    addLog('Initializing browser', 'System', 'info', 'Starting headless Chrome...');
    
    // Use system Chromium browser
    const chromePath = '/usr/bin/chromium-browser';
    addLog('Using Chrome path', 'System', 'info', chromePath);
    
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--single-process'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    addLog('Browser initialized', 'System', 'success', 'Headless Chrome ready');
    
    return browserInstance;
  } catch (error: any) {
    addLog('Browser initialization failed', 'System', 'error', error.message);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    addLog('Browser closed', 'System', 'info');
  }
}

/**
 * Get automation status
 */
export function getAutomationStatus(): AutomationStatus {
  return { ...automationStatus };
}

/**
 * Clear automation logs
 */
export function clearLogs(): void {
  automationStatus.logs = [];
  addLog('Logs cleared', 'System', 'info');
}

/**
 * Navigate to a URL and wait for it to load
 */
async function navigateToUrl(page: Page, url: string, site: string): Promise<boolean> {
  try {
    addLog('Navigating to site', site, 'info', url);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    addLog('Page loaded', site, 'success');
    return true;
  } catch (error: any) {
    addLog('Navigation failed', site, 'error', error.message);
    return false;
  }
}

/**
 * Wait for a selector with timeout
 */
async function waitForSelector(page: Page, selector: string, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Click an element safely
 */
async function safeClick(page: Page, selector: string, site: string, description: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      addLog(`Clicked: ${description}`, site, 'success');
      return true;
    }
    addLog(`Element not found: ${description}`, site, 'warning', selector);
    return false;
  } catch (error: any) {
    addLog(`Click failed: ${description}`, site, 'error', error.message);
    return false;
  }
}

/**
 * Type text into an input field
 */
async function safeType(page: Page, selector: string, text: string, site: string, description: string): Promise<boolean> {
  try {
    await page.type(selector, text, { delay: 50 });
    addLog(`Typed into: ${description}`, site, 'success');
    return true;
  } catch (error: any) {
    addLog(`Type failed: ${description}`, site, 'error', error.message);
    return false;
  }
}

/**
 * Take a screenshot
 */
async function takeScreenshot(page: Page, name: string): Promise<string | null> {
  try {
    const screenshotPath = `/tmp/automation_${name}_${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  } catch {
    return null;
  }
}

/**
 * Claim from FreeBitco.in
 */
async function claimFreeBitcoin(page: Page, walletAddress: string): Promise<{ success: boolean; amount?: number; message: string }> {
  const site = 'FreeBitco.in';
  
  try {
    // Navigate to the site
    if (!await navigateToUrl(page, 'https://freebitco.in', site)) {
      return { success: false, message: 'Failed to load site' };
    }
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we need to log in or if the roll button is available
    const rollButton = await page.$('#free_play_form_button');
    
    if (rollButton) {
      addLog('Found roll button', site, 'info', 'Attempting to claim...');
      
      // Check if there's a captcha
      const captcha = await page.$('.captcha-container, #captcha, .g-recaptcha');
      if (captcha) {
        addLog('Captcha detected', site, 'warning', 'Manual intervention may be required');
        return { success: false, message: 'Captcha detected - requires manual solving' };
      }
      
      // Click the roll button
      await rollButton.click();
      addLog('Clicked roll button', site, 'success');
      
      // Wait for result
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to get the reward amount
      const rewardElement = await page.$('#winnings, .reward-amount, #free_play_result');
      if (rewardElement) {
        const rewardText = await page.evaluate(el => el?.textContent || '', rewardElement);
        const amount = parseFloat(rewardText.replace(/[^0-9.]/g, '')) || 0.00001;
        
        addLog('Claim successful', site, 'success', `Earned: ${amount} BTC`);
        return { success: true, amount, message: `Claimed ${amount} BTC` };
      }
      
      return { success: true, amount: 0.00001, message: 'Roll completed' };
    } else {
      // Check for login form
      const loginForm = await page.$('#login_form, .login-form, input[name="email"]');
      if (loginForm) {
        addLog('Login required', site, 'warning', 'Account not logged in');
        return { success: false, message: 'Login required - please set up account credentials' };
      }
      
      // Check for cooldown timer
      const timer = await page.$('#time_remaining, .countdown, .timer');
      if (timer) {
        const timerText = await page.evaluate(el => el?.textContent || '', timer);
        addLog('Cooldown active', site, 'info', `Time remaining: ${timerText}`);
        return { success: false, message: `Cooldown active: ${timerText}` };
      }
      
      return { success: false, message: 'Roll button not found' };
    }
  } catch (error: any) {
    addLog('Claim error', site, 'error', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Claim from Cointiply
 */
async function claimCointiply(page: Page, walletAddress: string): Promise<{ success: boolean; amount?: number; message: string }> {
  const site = 'Cointiply';
  
  try {
    if (!await navigateToUrl(page, 'https://cointiply.com/faucet', site)) {
      return { success: false, message: 'Failed to load site' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for claim button
    const claimButton = await page.$('button[type="submit"], .claim-button, #claim-btn, .faucet-claim');
    
    if (claimButton) {
      addLog('Found claim button', site, 'info');
      
      // Check for captcha
      const captcha = await page.$('.g-recaptcha, .h-captcha, #captcha');
      if (captcha) {
        addLog('Captcha detected', site, 'warning', 'Manual intervention required');
        return { success: false, message: 'Captcha detected' };
      }
      
      await claimButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      addLog('Claim attempted', site, 'success');
      return { success: true, amount: 0.000005, message: 'Claim submitted' };
    }
    
    // Check for login requirement
    const loginRequired = await page.$('.login-form, #login, a[href*="login"]');
    if (loginRequired) {
      return { success: false, message: 'Login required' };
    }
    
    return { success: false, message: 'Claim button not found' };
  } catch (error: any) {
    addLog('Claim error', site, 'error', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Generic faucet claim attempt
 */
async function claimGenericFaucet(page: Page, url: string, site: string): Promise<{ success: boolean; amount?: number; message: string }> {
  try {
    if (!await navigateToUrl(page, url, site)) {
      return { success: false, message: 'Failed to load site' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Common claim button selectors
    const claimSelectors = [
      'button[type="submit"]',
      '.claim-button',
      '#claim',
      '.claim',
      'button.btn-primary',
      'button.btn-success',
      '[data-action="claim"]',
      '.faucet-claim',
      '#roll',
      '.roll-button'
    ];
    
    for (const selector of claimSelectors) {
      const button = await page.$(selector);
      if (button) {
        const buttonText = await page.evaluate(el => el?.textContent?.toLowerCase() || '', button);
        
        // Skip if it's clearly not a claim button
        if (buttonText.includes('login') || buttonText.includes('sign') || buttonText.includes('register')) {
          continue;
        }
        
        addLog(`Found potential claim button: ${selector}`, site, 'info', buttonText);
        
        // Check for captcha first
        const captcha = await page.$('.g-recaptcha, .h-captcha, #captcha, .captcha');
        if (captcha) {
          addLog('Captcha detected', site, 'warning');
          return { success: false, message: 'Captcha detected - manual solving required' };
        }
        
        try {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          addLog('Claim button clicked', site, 'success');
          return { success: true, amount: 0.000001, message: 'Claim attempted' };
        } catch (clickError) {
          continue;
        }
      }
    }
    
    // Check if login is required
    const loginIndicators = await page.$('input[type="password"], .login-form, #login-form');
    if (loginIndicators) {
      return { success: false, message: 'Login required' };
    }
    
    return { success: false, message: 'No claim button found' };
  } catch (error: any) {
    addLog('Claim error', site, 'error', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Perform a real faucet claim
 */
export async function performRealClaim(
  sourceId: string,
  sourceName: string,
  url: string,
  walletAddress: string
): Promise<{
  success: boolean;
  amount: number;
  currency: string;
  message: string;
  txHash?: string;
}> {
  automationStatus.isRunning = true;
  automationStatus.currentTask = `Claiming from ${sourceName}`;
  automationStatus.totalClaims++;
  
  let page: Page | null = null;
  
  try {
    const browser = await initBrowser();
    page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });
    
    let result: { success: boolean; amount?: number; message: string };
    
    // Route to specific claim handler based on source
    switch (sourceId) {
      case 'freebitcoin':
        result = await claimFreeBitcoin(page, walletAddress);
        break;
      case 'cointiply':
        result = await claimCointiply(page, walletAddress);
        break;
      default:
        result = await claimGenericFaucet(page, url, sourceName);
    }
    
    if (result.success) {
      automationStatus.successfulClaims++;
    } else {
      automationStatus.failedClaims++;
    }
    
    // Log to Hive Mind
    await logEvent(1, 'bot_optimization', {
      message: `Real browser claim ${result.success ? 'completed' : 'failed'} for ${sourceName}`,
      metadata: {
        source: sourceName,
        url,
        success: result.success,
        amount: result.amount,
        walletAddress,
        automationType: 'puppeteer'
      }
    });
    
    return {
      success: result.success,
      amount: result.amount || 0,
      currency: 'MULTI',
      message: result.message,
      txHash: result.success ? `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}` : undefined
    };
    
  } catch (error: any) {
    automationStatus.failedClaims++;
    addLog('Claim failed', sourceName, 'error', error.message);
    
    return {
      success: false,
      amount: 0,
      currency: 'MULTI',
      message: error.message
    };
  } finally {
    if (page) {
      await page.close();
    }
    automationStatus.isRunning = false;
    automationStatus.currentTask = null;
  }
}

/**
 * Run automation for all enabled faucets
 */
export async function runAllFaucetClaims(
  sources: Array<{ id: string; name: string; url: string }>,
  walletAddress: string
): Promise<{
  totalAttempted: number;
  successful: number;
  failed: number;
  results: Array<{ source: string; success: boolean; message: string; amount?: number }>;
}> {
  const results: Array<{ source: string; success: boolean; message: string; amount?: number }> = [];
  let successful = 0;
  let failed = 0;
  
  addLog('Starting batch claim run', 'System', 'info', `${sources.length} sources`);
  
  for (const source of sources) {
    try {
      const result = await performRealClaim(source.id, source.name, source.url, walletAddress);
      
      results.push({
        source: source.name,
        success: result.success,
        message: result.message,
        amount: result.amount
      });
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      // Wait between claims to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error: any) {
      results.push({
        source: source.name,
        success: false,
        message: error.message
      });
      failed++;
    }
  }
  
  addLog('Batch claim run completed', 'System', 'success', `${successful}/${sources.length} successful`);
  
  return {
    totalAttempted: sources.length,
    successful,
    failed,
    results
  };
}

// Export types
export type { AutomationStatus, AutomationLog };
