/**
 * Self-Debugging System with LLM-Powered Error Detection
 * Real-time monitoring, automatic error detection, and self-healing
 */

import { invokeLLM } from './llm';
import { logEvent, communicateWithHiveMind } from './hiveMind';

// Error tracking state
interface ErrorRecord {
  id: string;
  timestamp: Date;
  type: 'runtime' | 'api' | 'database' | 'ui' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: Record<string, any>;
  resolved: boolean;
  resolution?: string;
  autoFixed: boolean;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  lastCheck: Date;
  errorRate: number;
  activeErrors: number;
  resolvedErrors: number;
  autoFixedCount: number;
}

// In-memory error storage
const errorLog: ErrorRecord[] = [];
let systemStartTime = Date.now();
let lastHealthCheck = new Date();
let autoFixedCount = 0;

// Known error patterns and their fixes
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: ErrorRecord['type'];
  severity: ErrorRecord['severity'];
  autoFix?: () => Promise<string>;
  suggestion: string;
}> = [
  {
    pattern: /NFT not found/i,
    type: 'database',
    severity: 'medium',
    suggestion: 'Ensure NFT ID exists in database before operations',
  },
  {
    pattern: /Database not available/i,
    type: 'database',
    severity: 'critical',
    suggestion: 'Check database connection and restart if needed',
  },
  {
    pattern: /Invalid marketplace/i,
    type: 'api',
    severity: 'low',
    suggestion: 'Validate marketplace name against supported list',
  },
  {
    pattern: /Hot wallet not initialized/i,
    type: 'runtime',
    severity: 'high',
    suggestion: 'Initialize hot wallet before transaction operations',
  },
  {
    pattern: /Insufficient balance/i,
    type: 'runtime',
    severity: 'high',
    suggestion: 'Fund hot wallet with ETH for gas fees',
  },
  {
    pattern: /TRPC.*error/i,
    type: 'api',
    severity: 'medium',
    suggestion: 'Check tRPC procedure input validation and handler logic',
  },
  {
    pattern: /fetch failed|network error/i,
    type: 'network',
    severity: 'medium',
    suggestion: 'Check network connectivity and retry with exponential backoff',
  },
  {
    pattern: /timeout/i,
    type: 'network',
    severity: 'medium',
    suggestion: 'Increase timeout or optimize slow operations',
  },
];

/**
 * Log an error and attempt auto-diagnosis
 */
export async function logError(
  error: Error | string,
  context: Record<string, any> = {}
): Promise<ErrorRecord> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Find matching pattern
  const matchedPattern = ERROR_PATTERNS.find(p => p.pattern.test(errorMessage));
  
  const record: ErrorRecord = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    type: matchedPattern?.type || 'runtime',
    severity: matchedPattern?.severity || 'medium',
    message: errorMessage,
    stack: errorStack,
    context,
    resolved: false,
    autoFixed: false,
  };
  
  errorLog.unshift(record);
  
  // Keep only last 1000 errors
  if (errorLog.length > 1000) {
    errorLog.pop();
  }
  
  // Log to Hive Mind
  await logEvent(context.userId || 0, 'system_event', {
    message: `🔴 Error detected: ${errorMessage}`,
    metadata: {
      errorId: record.id,
      type: record.type,
      severity: record.severity,
      suggestion: matchedPattern?.suggestion,
    }
  });
  
  // Attempt auto-fix for known patterns
  if (matchedPattern?.autoFix) {
    try {
      const resolution = await matchedPattern.autoFix();
      record.resolved = true;
      record.resolution = resolution;
      record.autoFixed = true;
      autoFixedCount++;
      
      await logEvent(context.userId || 0, 'system_event', {
        message: `✅ Auto-fixed error: ${errorMessage}`,
        metadata: { resolution }
      });
    } catch (fixError) {
      console.error('Auto-fix failed:', fixError);
    }
  }
  
  // For critical errors, use LLM to analyze
  if (record.severity === 'critical' || record.severity === 'high') {
    await analyzeCriticalError(record);
  }
  
  return record;
}

/**
 * Use LLM to analyze critical errors and suggest fixes
 */
async function analyzeCriticalError(error: ErrorRecord): Promise<void> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a debugging assistant for a web application. Analyze errors and provide actionable fixes.
          
The application is a content monetization platform with:
- NFT generation and marketplace listing
- Affiliate marketing automation
- Hot wallet for crypto transactions
- Multi-LLM intelligence system

Provide concise, specific fixes.`
        },
        {
          role: 'user',
          content: `Analyze this error and suggest a fix:

Error Type: ${error.type}
Severity: ${error.severity}
Message: ${error.message}
Stack: ${error.stack || 'N/A'}
Context: ${JSON.stringify(error.context, null, 2)}

Provide:
1. Root cause analysis (1-2 sentences)
2. Immediate fix (specific code or action)
3. Prevention strategy (1 sentence)`
        }
      ]
    });
    
    const content = response.choices[0]?.message?.content;
    const analysis = typeof content === 'string' ? content : '';
    
    // Store analysis in Hive Mind via communication
    await logEvent(0, 'system_event', {
      message: `🔍 Error Analysis: ${error.message.slice(0, 50)}...`,
      metadata: {
        errorId: error.id,
        analysis,
        type: 'error_analysis'
      }
    });
    
    // Update error record with analysis
    error.resolution = analysis;
    
  } catch (llmError) {
    console.error('LLM analysis failed:', llmError);
  }
}

/**
 * Get system health status
 */
export function getSystemHealth(): SystemHealth {
  const now = new Date();
  const recentErrors = errorLog.filter(
    e => now.getTime() - e.timestamp.getTime() < 3600000 // Last hour
  );
  
  const activeErrors = recentErrors.filter(e => !e.resolved).length;
  const criticalErrors = recentErrors.filter(
    e => !e.resolved && (e.severity === 'critical' || e.severity === 'high')
  ).length;
  
  let status: SystemHealth['status'] = 'healthy';
  if (criticalErrors > 0) {
    status = 'critical';
  } else if (activeErrors > 5) {
    status = 'degraded';
  }
  
  lastHealthCheck = now;
  
  return {
    status,
    uptime: Date.now() - systemStartTime,
    lastCheck: lastHealthCheck,
    errorRate: recentErrors.length / 60, // Errors per minute
    activeErrors,
    resolvedErrors: errorLog.filter(e => e.resolved).length,
    autoFixedCount,
  };
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit: number = 50): ErrorRecord[] {
  return errorLog.slice(0, limit);
}

/**
 * Get errors by type
 */
export function getErrorsByType(type: ErrorRecord['type']): ErrorRecord[] {
  return errorLog.filter(e => e.type === type);
}

/**
 * Mark error as resolved
 */
export function resolveError(errorId: string, resolution: string): boolean {
  const error = errorLog.find(e => e.id === errorId);
  if (error) {
    error.resolved = true;
    error.resolution = resolution;
    return true;
  }
  return false;
}

/**
 * Run system diagnostics
 */
export async function runDiagnostics(): Promise<{
  health: SystemHealth;
  issues: Array<{ area: string; status: string; details: string }>;
  recommendations: string[];
}> {
  const health = getSystemHealth();
  const issues: Array<{ area: string; status: string; details: string }> = [];
  const recommendations: string[] = [];
  
  // Check error patterns
  const errorTypes = new Map<string, number>();
  errorLog.slice(0, 100).forEach(e => {
    errorTypes.set(e.type, (errorTypes.get(e.type) || 0) + 1);
  });
  
  errorTypes.forEach((count, type) => {
    if (count > 10) {
      issues.push({
        area: type,
        status: 'warning',
        details: `${count} ${type} errors in recent history`
      });
      recommendations.push(`Investigate recurring ${type} errors`);
    }
  });
  
  // Check for unresolved critical errors
  const unresolvedCritical = errorLog.filter(
    e => !e.resolved && e.severity === 'critical'
  );
  if (unresolvedCritical.length > 0) {
    issues.push({
      area: 'critical_errors',
      status: 'critical',
      details: `${unresolvedCritical.length} unresolved critical errors`
    });
    recommendations.push('Immediately address critical errors');
  }
  
  // Add general recommendations based on error patterns
  if (issues.length > 0) {
    recommendations.push('Review error patterns and implement preventive measures');
    recommendations.push('Consider adding input validation to reduce errors');
  }
  
  return { health, issues, recommendations };
}

/**
 * Self-healing: Attempt to fix common issues automatically
 */
export async function attemptSelfHeal(): Promise<{
  attempted: number;
  fixed: number;
  details: string[];
}> {
  const details: string[] = [];
  let attempted = 0;
  let fixed = 0;
  
  // Find unresolved errors that might be auto-fixable
  const unresolvedErrors = errorLog.filter(e => !e.resolved && !e.autoFixed);
  
  for (const error of unresolvedErrors.slice(0, 10)) {
    attempted++;
    
    // Check if error matches a known pattern with auto-fix
    const matchedPattern = ERROR_PATTERNS.find(p => p.pattern.test(error.message));
    
    if (matchedPattern && matchedPattern.autoFix) {
      try {
        const resolution = await matchedPattern.autoFix();
        error.resolved = true;
        error.resolution = resolution;
        error.autoFixed = true;
        fixed++;
        autoFixedCount++;
        details.push(`Fixed: ${error.message.slice(0, 50)}...`);
      } catch {
        // Auto-fix failed, continue
      }
    }
  }
  
  return { attempted, fixed, details };
}

/**
 * Monitor function wrapper for automatic error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: Record<string, any> = {}
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await logError(error as Error, { ...context, args });
      throw error;
    }
  }) as T;
}

/**
 * Start continuous monitoring
 */
let monitoringInterval: NodeJS.Timeout | null = null;

export function startContinuousMonitoring(intervalMs: number = 60000): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  monitoringInterval = setInterval(async () => {
    const diagnostics = await runDiagnostics();
    
    if (diagnostics.health.status !== 'healthy') {
      console.log(`[SelfDebugger] System status: ${diagnostics.health.status}`);
      console.log(`[SelfDebugger] Active errors: ${diagnostics.health.activeErrors}`);
      
      // Attempt self-healing
      const healResult = await attemptSelfHeal();
      if (healResult.fixed > 0) {
        console.log(`[SelfDebugger] Auto-fixed ${healResult.fixed} errors`);
      }
    }
  }, intervalMs);
  
  console.log('[SelfDebugger] Continuous monitoring started');
}

export function stopContinuousMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('[SelfDebugger] Continuous monitoring stopped');
  }
}

/**
 * Get debugging summary for dashboard
 */
export function getDebuggingSummary(): {
  health: SystemHealth;
  recentErrors: ErrorRecord[];
  errorsByType: Record<string, number>;
  autoFixRate: number;
  isMonitoring: boolean;
} {
  const health = getSystemHealth();
  const recentErrors = getRecentErrors(20);
  
  const errorsByType: Record<string, number> = {};
  errorLog.forEach(e => {
    errorsByType[e.type] = (errorsByType[e.type] || 0) + 1;
  });
  
  const totalErrors = errorLog.length;
  const autoFixRate = totalErrors > 0 ? autoFixedCount / totalErrors : 1;
  
  return {
    health,
    recentErrors,
    errorsByType,
    autoFixRate,
    isMonitoring: monitoringInterval !== null,
  };
}

// Auto-start monitoring on module load
startContinuousMonitoring();
