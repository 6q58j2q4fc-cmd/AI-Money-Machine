/**
 * Security Middleware for Source Code Protection
 * Implements rate limiting, request signing, and source protection
 * while allowing all API/bot communications to work uninterrupted
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  skipPaths: string[];   // Paths to skip rate limiting
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Default rate limit config - generous limits to not interfere with bots
const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute window
  maxRequests: 1000,    // 1000 requests per minute (very generous for bots)
  skipPaths: [
    '/api/trpc',        // Allow all tRPC calls (internal API)
    '/api/oauth',       // OAuth flows
    '/api/health',      // Health checks
    '/api/webhook',     // Webhooks from external services
    '/api/cron',        // Scheduled tasks
    '/_next',           // Next.js internals
    '/assets',          // Static assets
    '/public',          // Public files
  ],
};

/**
 * Rate limiting middleware
 * Generous limits to allow bots and automation while preventing abuse
 */
export function rateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultRateLimitConfig, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for whitelisted paths
    const shouldSkip = finalConfig.skipPaths.some(path => req.path.startsWith(path));
    if (shouldSkip) {
      return next();
    }
    
    // Use IP as identifier (in production, also consider user ID)
    const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();
    
    let record = rateLimitStore.get(identifier);
    
    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      };
      rateLimitStore.set(identifier, record);
    } else {
      record.count++;
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, finalConfig.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    if (record.count > finalConfig.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }
    
    next();
  };
}

/**
 * Request signature verification for sensitive operations
 * Used for webhook verification and API authentication
 */
export function verifyRequestSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    
    if (!signature || !timestamp) {
      return next(); // Skip if no signature headers (allow unsigned requests for now)
    }
    
    // Verify timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Request timestamp expired' });
    }
    
    // Verify signature
    const payload = `${timestamp}.${JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }
    
    next();
  };
}

/**
 * Security headers middleware
 * Protects against common web vulnerabilities
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy (allow APIs and external resources)
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googleapis.com https://manus-analytics.com https://*.manus.computer https://*.manus.im",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "object-src 'none'",
    ].join('; '));
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    next();
  };
}

/**
 * Source map protection
 * Prevents access to source maps in production
 */
export function sourceMapProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Block access to source map files
    if (req.path.endsWith('.map')) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Block access to source files
    if (req.path.match(/\.(ts|tsx|jsx)$/)) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    next();
  };
}

/**
 * API key validation for external integrations
 * Validates API keys without blocking internal operations
 */
export function validateApiKey(validKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    // Skip validation for internal paths
    if (req.path.startsWith('/api/trpc') || req.path.startsWith('/api/oauth')) {
      return next();
    }
    
    // If API key is provided, validate it
    if (apiKey && !validKeys.includes(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    next();
  };
}

/**
 * CORS configuration for API access
 * Allows cross-origin requests from trusted sources
 */
export function corsConfig() {
  const allowedOrigins = [
    'https://manus.im',
    'https://*.manus.im',
    'https://*.manus.computer',
    'https://opensea.io',
    'https://blur.io',
    'https://rarible.com',
    'https://dev.to',
    'https://medium.com',
    'https://api.cj.com',
    'https://api.awin.com',
  ];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Allow requests without origin (same-origin or non-browser)
    if (!origin) {
      return next();
    }
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Signature, X-Timestamp');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * Request logging for security auditing
 * Logs requests for security analysis without blocking
 */
export function securityLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        duration,
      };
      
      // Log suspicious activity
      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
        console.warn('[Security] Suspicious request:', logEntry);
      }
    });
    
    next();
  };
}

/**
 * Bot-friendly middleware
 * Ensures all automation and bot traffic is allowed through
 */
export function botFriendly() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // Identify known bots and automation
    const isBot = /bot|crawler|spider|automation|puppeteer|headless|selenium/i.test(userAgent);
    
    // Mark request as bot for downstream processing
    (req as any).isBot = isBot;
    
    // Always allow bot traffic through
    next();
  };
}

/**
 * Apply all security middleware to Express app
 * Configured to protect source code while allowing all API/bot communications
 */
export function applySecurityMiddleware(app: any) {
  // Bot-friendly first - ensure bots are identified and allowed
  app.use(botFriendly());
  
  // Security headers
  app.use(securityHeaders());
  
  // Source map protection
  app.use(sourceMapProtection());
  
  // CORS configuration
  app.use(corsConfig());
  
  // Rate limiting (generous limits for bots)
  app.use(rateLimiter());
  
  // Security logging
  app.use(securityLogger());
  
  console.log('[Security] Security middleware applied successfully');
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash sensitive data
 */
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(data, actualSalt, 64).toString('hex');
  return `${actualSalt}:${hash}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  const [salt, hash] = hashedData.split(':');
  const verifyHash = crypto.scryptSync(data, salt, 64).toString('hex');
  return hash === verifyHash;
}
