import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the image generation module
vi.mock('./_core/imageGeneration', () => ({
  generateImage: vi.fn().mockResolvedValue({ url: 'https://example.com/test-image.png' })
}));

// Mock the hiveMind module
vi.mock('./_core/hiveMind', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined)
}));

// Mock the LLM module for data monetization
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ question: 'Test question?', answer: 'Test answer.' }) } }]
  })
}));

describe('NFT Empire Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateHighValueNFT', () => {
    it('should generate a high-value NFT with all required properties', async () => {
      const { generateHighValueNFT } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1);
      
      expect(nft).toBeDefined();
      expect(nft.id).toMatch(/^EMPIRE-/);
      expect(nft.name).toBeDefined();
      expect(nft.imageUrl).toBeDefined();
      expect(nft.category).toBeDefined();
      expect(nft.rarity).toBeDefined();
      expect(nft.currentValue).toBeGreaterThan(0);
      expect(nft.status).toBe('generated');
      expect(nft.listings).toEqual([]);
      expect(nft.autoBuyOffers).toEqual([]);
    });

    it('should generate NFT with specified category', async () => {
      const { generateHighValueNFT } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1, { category: 'pfp' });
      
      expect(nft.category).toBe('pfp');
    });

    it('should generate NFT with forced rarity', async () => {
      const { generateHighValueNFT } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1, { forceRarity: 'legendary' });
      
      expect(nft.rarity).toBe('legendary');
    });
  });

  describe('listOnAllMarketplaces', () => {
    it('should list NFT on multiple marketplaces', async () => {
      const { generateHighValueNFT, listOnAllMarketplaces } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1);
      const result = await listOnAllMarketplaces(1, nft.id);
      
      expect(result.success).toBe(true);
      expect(result.listings.length).toBeGreaterThan(0);
      expect(result.totalPotentialValue).toBeGreaterThan(0);
      
      // Check listing structure
      const listing = result.listings[0];
      expect(listing.marketplace).toBeDefined();
      expect(listing.listingUrl).toBeDefined();
      expect(listing.viewUrl).toBeDefined();
      expect(listing.price).toBeGreaterThan(0);
      expect(listing.status).toBe('active');
    });

    it('should throw error for non-existent NFT', async () => {
      const { listOnAllMarketplaces } = await import('./_core/nftEmpire');
      
      await expect(listOnAllMarketplaces(1, 'non-existent-id'))
        .rejects.toThrow('NFT not found');
    });
  });

  describe('submitToAutoBuyPlatforms', () => {
    it('should submit NFT to auto-buy platforms and receive offers', async () => {
      const { generateHighValueNFT, submitToAutoBuyPlatforms } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1);
      const result = await submitToAutoBuyPlatforms(1, nft.id);
      
      expect(result.offers.length).toBeGreaterThan(0);
      expect(result.totalPotentialEarnings).toBeGreaterThan(0);
      
      // Check offer structure
      const offer = result.offers[0];
      expect(offer.platform).toBeDefined();
      expect(offer.platformUrl).toBeDefined();
      expect(offer.offerPrice).toBeGreaterThan(0);
      expect(offer.currency).toBe('USD');
    });
  });

  describe('transferToWallet', () => {
    it('should transfer NFT to specified wallet', async () => {
      const { generateHighValueNFT, transferToWallet } = await import('./_core/nftEmpire');
      
      const nft = await generateHighValueNFT(1);
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const result = await transferToWallet(1, nft.id, walletAddress);
      
      expect(result.success).toBe(true);
      expect(result.txHash).toMatch(/^0x/);
      expect(result.txHash.length).toBe(66);
    });
  });

  describe('batchGenerateEmpireNFTs', () => {
    it('should batch generate multiple NFTs', async () => {
      const { batchGenerateEmpireNFTs } = await import('./_core/nftEmpire');
      
      const result = await batchGenerateEmpireNFTs(1, 3, {
        autoList: true,
        autoSubmitToBuyers: false
      });
      
      expect(result.generated).toBe(3);
      expect(result.listed).toBe(3);
      expect(result.totalValue).toBeGreaterThan(0);
      expect(result.nfts.length).toBe(3);
    });
  });

  describe('getEmpirePortfolio', () => {
    it('should return portfolio with correct structure', async () => {
      const { getEmpirePortfolio } = await import('./_core/nftEmpire');
      
      const portfolio = getEmpirePortfolio();
      
      expect(portfolio).toHaveProperty('totalNFTs');
      expect(portfolio).toHaveProperty('totalValue');
      expect(portfolio).toHaveProperty('totalEarnings');
      expect(portfolio).toHaveProperty('pendingOffers');
      expect(portfolio).toHaveProperty('activeListings');
      expect(portfolio).toHaveProperty('soldNFTs');
      expect(portfolio).toHaveProperty('walletBalance');
      expect(portfolio).toHaveProperty('nfts');
    });
  });

  describe('getAvailableMarketplaces', () => {
    it('should return list of marketplaces', async () => {
      const { getAvailableMarketplaces } = await import('./_core/nftEmpire');
      
      const marketplaces = getAvailableMarketplaces();
      
      expect(marketplaces.length).toBeGreaterThan(0);
      expect(marketplaces[0]).toHaveProperty('name');
      expect(marketplaces[0]).toHaveProperty('baseUrl');
      expect(marketplaces[0]).toHaveProperty('fee');
      expect(marketplaces[0]).toHaveProperty('volume24h');
    });
  });

  describe('getAutoBuyPlatforms', () => {
    it('should return list of auto-buy platforms', async () => {
      const { getAutoBuyPlatforms } = await import('./_core/nftEmpire');
      
      const platforms = getAutoBuyPlatforms();
      
      expect(platforms.length).toBeGreaterThan(0);
      expect(platforms[0]).toHaveProperty('name');
      expect(platforms[0]).toHaveProperty('url');
      expect(platforms[0]).toHaveProperty('type');
      expect(platforms[0]).toHaveProperty('minPayout');
    });
  });

  describe('getHighValueCategories', () => {
    it('should return list of high-value categories', async () => {
      const { getHighValueCategories } = await import('./_core/nftEmpire');
      
      const categories = getHighValueCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('category');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('avgFloorPrice');
      expect(categories[0]).toHaveProperty('demandScore');
    });
  });
});

describe('Data Monetization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDataBatch', () => {
    it('should generate a batch of data items', async () => {
      const { generateDataBatch } = await import('./_core/dataMonetization');
      
      const batch = await generateDataBatch(1, {
        type: 'structured_data',
        count: 3
      });
      
      expect(batch).toBeDefined();
      expect(batch.id).toMatch(/^BATCH-/);
      expect(batch.type).toBe('structured_data');
      expect(batch.itemCount).toBe(3);
      expect(batch.totalValue).toBeGreaterThan(0);
      expect(batch.items.length).toBe(3);
      expect(batch.status).toBe('complete');
    }, 10000);

    it('should generate data with topic', async () => {
      const { generateDataBatch } = await import('./_core/dataMonetization');
      
      const batch = await generateDataBatch(1, {
        type: 'sentiment_data',
        count: 2,
        topic: 'technology'
      });
      
      expect(batch.items.length).toBe(2);
      expect(batch.type).toBe('sentiment_data');
    }, 10000);
  });

  describe('submitDataToPlatforms', () => {
    it('should submit data batch to platforms', async () => {
      const { generateDataBatch, submitDataToPlatforms } = await import('./_core/dataMonetization');
      
      const batch = await generateDataBatch(1, {
        type: 'structured_data',
        count: 2
      });
      
      const result = await submitDataToPlatforms(1, batch.id);
      
      expect(result.submissions.length).toBeGreaterThan(0);
      expect(result.totalOffered).toBeGreaterThan(0);
      
      // Check submission structure
      const submission = result.submissions[0];
      expect(submission.platform).toBeDefined();
      expect(submission.platformUrl).toBeDefined();
      expect(submission.status).toBeDefined();
    }, 15000);
  });

  describe('getDataBuyingPlatforms', () => {
    it('should return list of data buying platforms', async () => {
      const { getDataBuyingPlatforms } = await import('./_core/dataMonetization');
      
      const platforms = getDataBuyingPlatforms();
      
      expect(platforms.length).toBeGreaterThan(0);
      expect(platforms[0]).toHaveProperty('name');
      expect(platforms[0]).toHaveProperty('url');
      expect(platforms[0]).toHaveProperty('type');
      expect(platforms[0]).toHaveProperty('payRate');
    });
  });

  describe('getDataGenerationTypes', () => {
    it('should return list of data generation types', async () => {
      const { getDataGenerationTypes } = await import('./_core/dataMonetization');
      
      const types = getDataGenerationTypes();
      
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]).toHaveProperty('type');
      expect(types[0]).toHaveProperty('name');
      expect(types[0]).toHaveProperty('avgValuePerItem');
    });
  });

  describe('getDataMonetizationStats', () => {
    it('should return stats with correct structure', async () => {
      const { getDataMonetizationStats } = await import('./_core/dataMonetization');
      
      const stats = getDataMonetizationStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('totalBatches');
      expect(stats).toHaveProperty('totalValue');
      expect(stats).toHaveProperty('earnings');
      expect(stats).toHaveProperty('topPlatforms');
    });
  });
});
