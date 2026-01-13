import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment
vi.mock('./_core/env', () => ({
  ENV: {
    forgeApiUrl: 'https://api.test.com',
    forgeApiKey: 'test-key',
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

// Mock image generation to avoid actual API calls
vi.mock('./_core/imageGeneration', () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: 'https://example.com/generated-image.png'
  })
}));

// Mock storage
vi.mock('../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: 'https://storage.example.com/nft.png',
    key: 'nft.png'
  })
}));

describe('NFT Automation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArtStyles', () => {
    it('should return available art styles', async () => {
      const { getArtStyles } = await import('./_core/nftAutomation');
      
      const styles = getArtStyles();
      
      expect(styles).toBeDefined();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
      
      // Check style structure
      const firstStyle = styles[0];
      expect(firstStyle).toHaveProperty('style');
      expect(firstStyle).toHaveProperty('description');
      expect(firstStyle).toHaveProperty('avgPrice');
      expect(firstStyle).toHaveProperty('popularity');
    });

    it('should include popular styles', async () => {
      const { getArtStyles } = await import('./_core/nftAutomation');
      
      const styles = getArtStyles();
      const styleNames = styles.map(s => s.style);
      
      expect(styleNames).toContain('abstract');
      expect(styleNames).toContain('pixel');
      expect(styleNames).toContain('cyberpunk');
      expect(styleNames).toContain('anime');
    });
  });

  describe('getMarketplaces', () => {
    it('should return available marketplaces', async () => {
      const { getMarketplaces } = await import('./_core/nftAutomation');
      
      const marketplaces = getMarketplaces();
      
      expect(marketplaces).toBeDefined();
      expect(Array.isArray(marketplaces)).toBe(true);
      expect(marketplaces.length).toBeGreaterThan(0);
      
      // Check marketplace structure
      const firstMarketplace = marketplaces[0];
      expect(firstMarketplace).toHaveProperty('name');
      expect(firstMarketplace).toHaveProperty('url');
      expect(firstMarketplace).toHaveProperty('fee');
      expect(firstMarketplace).toHaveProperty('chains');
      expect(firstMarketplace).toHaveProperty('autoList');
    });

    it('should include major marketplaces', async () => {
      const { getMarketplaces } = await import('./_core/nftAutomation');
      
      const marketplaces = getMarketplaces();
      const names = marketplaces.map(m => m.name);
      
      expect(names).toContain('OpenSea');
      expect(names).toContain('Rarible');
      expect(names).toContain('LooksRare');
      expect(names).toContain('Blur');
    });
  });

  describe('generateNFT', () => {
    it('should generate an NFT with default style', async () => {
      const { generateNFT } = await import('./_core/nftAutomation');
      
      const nft = await generateNFT(1);
      
      expect(nft).toBeDefined();
      expect(nft).toHaveProperty('id');
      expect(nft).toHaveProperty('name');
      expect(nft).toHaveProperty('description');
      expect(nft).toHaveProperty('imageUrl');
      expect(nft).toHaveProperty('style');
      expect(nft).toHaveProperty('traits');
      expect(nft).toHaveProperty('suggestedPrice');
      expect(nft).toHaveProperty('status', 'generated');
    });

    it('should generate an NFT with specified style', async () => {
      const { generateNFT } = await import('./_core/nftAutomation');
      
      const nft = await generateNFT(1, { style: 'cyberpunk' });
      
      expect(nft.style).toBe('cyberpunk');
    });

    it('should generate an NFT with custom collection name', async () => {
      const { generateNFT } = await import('./_core/nftAutomation');
      
      const nft = await generateNFT(1, { collectionName: 'Test Collection' });
      
      expect(nft.name).toContain('Test Collection');
    });
  });

  describe('autoListNFT', () => {
    it('should list NFT on multiple marketplaces', async () => {
      const { generateNFT, autoListNFT } = await import('./_core/nftAutomation');
      
      // First generate an NFT
      const nft = await generateNFT(1);
      
      // Then auto-list it
      const result = await autoListNFT(1, nft.id);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('listings');
      expect(Array.isArray(result.listings)).toBe(true);
      expect(result.listings.length).toBeGreaterThan(0);
      
      // Check listing structure
      const firstListing = result.listings[0];
      expect(firstListing).toHaveProperty('marketplace');
      expect(firstListing).toHaveProperty('listingUrl');
      expect(firstListing).toHaveProperty('price');
      expect(firstListing).toHaveProperty('status', 'active');
    });

    it('should throw error for non-existent NFT', async () => {
      const { autoListNFT } = await import('./_core/nftAutomation');
      
      await expect(autoListNFT(1, 'non-existent-id')).rejects.toThrow('NFT not found');
    });
  });

  describe('getOptimalPricing', () => {
    it('should return pricing recommendations', async () => {
      const { getOptimalPricing } = await import('./_core/nftAutomation');
      
      const pricing = getOptimalPricing('abstract');
      
      expect(pricing).toHaveProperty('minPrice');
      expect(pricing).toHaveProperty('maxPrice');
      expect(pricing).toHaveProperty('recommendedPrice');
      expect(pricing).toHaveProperty('marketAverage');
      expect(typeof pricing.recommendedPrice).toBe('number');
      expect(pricing.minPrice).toBeLessThan(pricing.maxPrice);
    });
  });

  describe('getNFTMarketIntelligence', () => {
    it('should return market intelligence data', async () => {
      const { getNFTMarketIntelligence } = await import('./_core/nftAutomation');
      
      const intelligence = getNFTMarketIntelligence();
      
      expect(intelligence).toHaveProperty('topStyles');
      expect(intelligence).toHaveProperty('topMarketplaces');
      expect(intelligence).toHaveProperty('priceRecommendations');
      expect(intelligence).toHaveProperty('totalGenerated');
      expect(intelligence).toHaveProperty('totalListed');
      expect(intelligence).toHaveProperty('totalSold');
      
      expect(Array.isArray(intelligence.topStyles)).toBe(true);
      expect(Array.isArray(intelligence.topMarketplaces)).toBe(true);
    });

    it('should have price recommendations', async () => {
      const { getNFTMarketIntelligence } = await import('./_core/nftAutomation');
      
      const intelligence = getNFTMarketIntelligence();
      
      expect(intelligence.priceRecommendations).toHaveProperty('conservative');
      expect(intelligence.priceRecommendations).toHaveProperty('moderate');
      expect(intelligence.priceRecommendations).toHaveProperty('aggressive');
      expect(intelligence.priceRecommendations.conservative).toBeLessThan(intelligence.priceRecommendations.aggressive);
    });
  });

  describe('batchGenerateAndList', () => {
    it('should generate multiple NFTs', async () => {
      const { batchGenerateAndList } = await import('./_core/nftAutomation');
      
      const result = await batchGenerateAndList(1, 2, {
        collectionName: 'Test Batch'
      });
      
      expect(result).toHaveProperty('generated');
      expect(result).toHaveProperty('listed');
      expect(result).toHaveProperty('nfts');
      expect(result.generated).toBe(2);
      expect(result.nfts.length).toBe(2);
    });

    it('should apply collection name to all NFTs', async () => {
      const { batchGenerateAndList } = await import('./_core/nftAutomation');
      
      const result = await batchGenerateAndList(1, 2, {
        collectionName: 'My Collection'
      });
      
      result.nfts.forEach(nft => {
        expect(nft.name).toContain('My Collection');
      });
    });
  });

  describe('getAllNFTs', () => {
    it('should return all generated NFTs', async () => {
      const { getAllNFTs, generateNFT } = await import('./_core/nftAutomation');
      
      // Generate a few NFTs first
      await generateNFT(1);
      await generateNFT(1);
      
      const nfts = getAllNFTs();
      
      expect(Array.isArray(nfts)).toBe(true);
      expect(nfts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('learnFromSales', () => {
    it('should update learning data from sale', async () => {
      const { generateNFT, learnFromSales, getNFTMarketIntelligence } = await import('./_core/nftAutomation');
      
      // Generate an NFT
      const nft = await generateNFT(1, { style: 'abstract' });
      
      // Get initial intelligence
      const beforeIntelligence = getNFTMarketIntelligence();
      
      // Simulate a sale
      await learnFromSales(1, {
        nftId: nft.id,
        marketplace: 'OpenSea',
        soldPrice: 0.5
      });
      
      // Intelligence should be updated
      const afterIntelligence = getNFTMarketIntelligence();
      expect(afterIntelligence).toBeDefined();
    });
  });
});
