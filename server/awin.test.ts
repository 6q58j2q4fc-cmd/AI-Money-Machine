import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment
vi.mock('./_core/env', () => ({
  ENV: {
    awinApiKey: 'test-api-key-12345',
    builtInForgeApiUrl: 'https://api.test.com',
    builtInForgeApiKey: 'test-key',
  }
}));

// Mock the hiveMind logEvent
vi.mock('./_core/hiveMind', () => ({
  logEvent: vi.fn().mockResolvedValue(1),
  getHiveMindState: vi.fn().mockReturnValue({
    pageContexts: {},
    objectivesCount: 5,
    lastUpdated: new Date(),
    conversationCount: 10,
  }),
}));

describe('Awin API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAwinProgrammes', () => {
    it('should return mock programmes when API is not available', async () => {
      const { getAwinProgrammes } = await import('./_core/awinApi');
      
      const programmes = await getAwinProgrammes();
      
      expect(programmes).toBeDefined();
      expect(Array.isArray(programmes)).toBe(true);
      expect(programmes.length).toBeGreaterThan(0);
      
      // Check programme structure
      const firstProgramme = programmes[0];
      expect(firstProgramme).toHaveProperty('id');
      expect(firstProgramme).toHaveProperty('name');
      expect(firstProgramme).toHaveProperty('displayUrl');
      expect(firstProgramme).toHaveProperty('clickThroughUrl');
      expect(firstProgramme).toHaveProperty('status');
    });

    it('should include expected mock advertisers', async () => {
      const { getAwinProgrammes } = await import('./_core/awinApi');
      
      const programmes = await getAwinProgrammes();
      const names = programmes.map(p => p.name);
      
      expect(names).toContain('Amazon Associates');
      expect(names).toContain('eBay Partner Network');
      expect(names).toContain('NordVPN');
    });
  });

  describe('searchAwinProgrammes', () => {
    it('should filter programmes by keyword', async () => {
      const { searchAwinProgrammes } = await import('./_core/awinApi');
      
      const results = await searchAwinProgrammes('VPN');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        const combined = `${p.name} ${p.description || ''}`.toLowerCase();
        expect(combined).toContain('vpn');
      });
    });

    it('should return empty array for non-matching keyword', async () => {
      const { searchAwinProgrammes } = await import('./_core/awinApi');
      
      const results = await searchAwinProgrammes('xyznonexistent123');
      
      expect(results).toEqual([]);
    });
  });

  describe('createAwinLink', () => {
    it('should generate a tracking URL', async () => {
      const { createAwinLink } = await import('./_core/awinApi');
      
      const result = await createAwinLink(undefined, 1001, 'https://example.com/product');
      
      expect(result).toHaveProperty('originalUrl', 'https://example.com/product');
      expect(result).toHaveProperty('trackingUrl');
      expect(result).toHaveProperty('advertiserId', 1001);
      expect(result.trackingUrl).toContain('awin');
    });
  });

  describe('checkAwinApiStatus', () => {
    it('should return status object', async () => {
      const { checkAwinApiStatus } = await import('./_core/awinApi');
      
      const status = await checkAwinApiStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('message');
      expect(typeof status.configured).toBe('boolean');
    });
  });

  describe('getAwinCommissionSummary', () => {
    it('should return commission summary with default values', async () => {
      const { getAwinCommissionSummary } = await import('./_core/awinApi');
      
      const summary = await getAwinCommissionSummary();
      
      expect(summary).toHaveProperty('totalCommission');
      expect(summary).toHaveProperty('totalSales');
      expect(summary).toHaveProperty('transactionCount');
      expect(summary).toHaveProperty('currency');
      expect(typeof summary.totalCommission).toBe('number');
    });
  });

  describe('importAwinLinksToDatabase', () => {
    it('should convert programmes to affiliate link format', async () => {
      const { getAwinProgrammes, importAwinLinksToDatabase } = await import('./_core/awinApi');
      
      const programmes = await getAwinProgrammes();
      const result = await importAwinLinksToDatabase(1, programmes);
      
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('links');
      expect(result.imported).toBe(programmes.length);
      expect(result.links.length).toBe(programmes.length);
      
      // Check link structure
      const firstLink = result.links[0];
      expect(firstLink).toHaveProperty('name');
      expect(firstLink).toHaveProperty('url');
      expect(firstLink).toHaveProperty('category');
      expect(firstLink).toHaveProperty('network', 'awin');
    });
  });
});

describe('Always Awake System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAlwaysAwakeStatus', () => {
    it('should return system status', async () => {
      const { getAlwaysAwakeStatus } = await import('./_core/alwaysAwake');
      
      const status = getAlwaysAwakeStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastHeartbeat');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('scheduledTasks');
      expect(typeof status.isRunning).toBe('boolean');
    });
  });

  describe('getEarningsSummary', () => {
    it('should return earnings summary', async () => {
      const { getEarningsSummary } = await import('./_core/alwaysAwake');
      
      const summary = getEarningsSummary();
      
      expect(summary).toHaveProperty('totalEarnings');
      expect(summary).toHaveProperty('articlesGenerated');
      expect(summary).toHaveProperty('affiliateLinksCreated');
      expect(summary).toHaveProperty('cryptoOpportunities');
      expect(summary).toHaveProperty('faucetsClaimed');
      expect(summary).toHaveProperty('airdropsChecked');
      expect(summary).toHaveProperty('estimatedDailyEarnings');
    });
  });

  describe('startAlwaysAwake', () => {
    it('should start the system and return success', async () => {
      const { startAlwaysAwake, stopAlwaysAwake } = await import('./_core/alwaysAwake');
      
      // First stop if running
      await stopAlwaysAwake(1);
      
      const result = await startAlwaysAwake(1);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('status');
      expect(result.message).toContain('started');
      
      // Clean up
      await stopAlwaysAwake(1);
    });

    it('should return false if already running', async () => {
      const { startAlwaysAwake, stopAlwaysAwake } = await import('./_core/alwaysAwake');
      
      // Start first
      await startAlwaysAwake(1);
      
      // Try to start again
      const result = await startAlwaysAwake(1);
      
      expect(result).toHaveProperty('success', false);
      expect(result.message).toContain('already running');
      
      // Clean up
      await stopAlwaysAwake(1);
    });
  });

  describe('stopAlwaysAwake', () => {
    it('should stop the system', async () => {
      const { startAlwaysAwake, stopAlwaysAwake } = await import('./_core/alwaysAwake');
      
      // Start first
      await startAlwaysAwake(1);
      
      const result = await stopAlwaysAwake(1);
      
      expect(result).toHaveProperty('success', true);
      expect(result.message).toContain('stopped');
    });
  });

  describe('wakeUp', () => {
    it('should wake up the system if not running', async () => {
      const { wakeUp, stopAlwaysAwake } = await import('./_core/alwaysAwake');
      
      // Ensure stopped
      await stopAlwaysAwake(1);
      
      const result = await wakeUp(1);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('wasAsleep');
      
      // Clean up
      await stopAlwaysAwake(1);
    });
  });

  describe('forceRunAll', () => {
    it('should run all operations and return results', async () => {
      const { forceRunAll } = await import('./_core/alwaysAwake');
      
      const result = await forceRunAll(1);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});
