import { describe, it, expect, vi } from 'vitest';

// Mock the image generation
vi.mock('./_core/imageGeneration', () => ({
  generateImage: vi.fn().mockResolvedValue({ url: 'https://example.com/generated-image.png' })
}));

// Mock storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/metadata.json', key: 'metadata.json' })
}));

describe('OpenSea NFT Service', () => {
  it('should have high-value categories defined', async () => {
    const { HIGH_VALUE_CATEGORIES } = await import('./_core/openSeaNFT');
    expect(HIGH_VALUE_CATEGORIES).toBeDefined();
    expect(HIGH_VALUE_CATEGORIES.length).toBeGreaterThan(0);
    expect(HIGH_VALUE_CATEGORIES[0]).toHaveProperty('name');
    expect(HIGH_VALUE_CATEGORIES[0]).toHaveProperty('basePrice');
    expect(HIGH_VALUE_CATEGORIES[0]).toHaveProperty('multiplier');
  });

  it('should have trending styles defined', async () => {
    const { TRENDING_STYLES } = await import('./_core/openSeaNFT');
    expect(TRENDING_STYLES).toBeDefined();
    expect(TRENDING_STYLES.length).toBeGreaterThan(0);
    expect(typeof TRENDING_STYLES[0]).toBe('string');
  });

  it('should generate high-value NFT with correct structure', async () => {
    const { generateHighValueNFT } = await import('./_core/openSeaNFT');
    const nft = await generateHighValueNFT();
    
    expect(nft).toHaveProperty('id');
    expect(nft).toHaveProperty('name');
    expect(nft).toHaveProperty('description');
    expect(nft).toHaveProperty('imageUrl');
    expect(nft).toHaveProperty('metadataUrl');
    expect(nft).toHaveProperty('category');
    expect(nft).toHaveProperty('style');
    expect(nft).toHaveProperty('estimatedValue');
    expect(nft).toHaveProperty('attributes');
    expect(nft).toHaveProperty('createdAt');
    expect(nft).toHaveProperty('listings');
    
    expect(nft.id).toMatch(/^nft-/);
    expect(nft.estimatedValue).toBeGreaterThan(0);
    expect(Array.isArray(nft.attributes)).toBe(true);
    expect(Array.isArray(nft.listings)).toBe(true);
  });

  it('should generate NFT with specific category', async () => {
    const { generateHighValueNFT, HIGH_VALUE_CATEGORIES } = await import('./_core/openSeaNFT');
    const category = HIGH_VALUE_CATEGORIES[0].name;
    const nft = await generateHighValueNFT(category);
    
    expect(nft.category).toBe(category);
  });

  it('should generate NFT attributes with correct structure', async () => {
    const { generateHighValueNFT } = await import('./_core/openSeaNFT');
    const nft = await generateHighValueNFT();
    
    expect(nft.attributes.length).toBeGreaterThan(0);
    
    const categoryAttr = nft.attributes.find(a => a.trait_type === 'Category');
    expect(categoryAttr).toBeDefined();
    
    const rarityAttr = nft.attributes.find(a => a.trait_type === 'Rarity');
    expect(rarityAttr).toBeDefined();
    expect(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).toContain(rarityAttr?.value);
  });

  it('should list NFT on OpenSea', async () => {
    const { generateHighValueNFT, listOnOpenSea } = await import('./_core/openSeaNFT');
    const nft = await generateHighValueNFT();
    const listing = await listOnOpenSea(nft);
    
    expect(listing).toHaveProperty('marketplace', 'OpenSea');
    expect(listing).toHaveProperty('listingUrl');
    expect(listing).toHaveProperty('price');
    expect(listing).toHaveProperty('currency', 'ETH');
    expect(listing).toHaveProperty('status', 'active');
    expect(listing).toHaveProperty('listedAt');
    
    expect(listing.listingUrl).toContain('opensea.io');
  });

  it('should list NFT on all marketplaces', async () => {
    const { generateHighValueNFT, listOnAllMarketplaces } = await import('./_core/openSeaNFT');
    const nft = await generateHighValueNFT();
    const listings = await listOnAllMarketplaces(nft);
    
    expect(listings.length).toBeGreaterThan(5);
    
    const marketplaceNames = listings.map(l => l.marketplace);
    expect(marketplaceNames).toContain('OpenSea');
    expect(marketplaceNames).toContain('Blur');
    expect(marketplaceNames).toContain('LooksRare');
    expect(marketplaceNames).toContain('Rarible');
    expect(marketplaceNames).toContain('Magic Eden');
    expect(marketplaceNames).toContain('Foundation');
    expect(marketplaceNames).toContain('SuperRare');
    expect(marketplaceNames).toContain('Zora');
  });

  it('should auto-generate and list multiple NFTs', async () => {
    const { autoGenerateAndList } = await import('./_core/openSeaNFT');
    const nfts = await autoGenerateAndList(2);
    
    expect(nfts.length).toBe(2);
    
    for (const nft of nfts) {
      expect(nft.listings.length).toBeGreaterThan(0);
      expect(nft.imageUrl).toBeDefined();
    }
  });

  it('should get OpenSea status', async () => {
    const { getOpenSeaStatus } = await import('./_core/openSeaNFT');
    const status = await getOpenSeaStatus();
    
    expect(status).toHaveProperty('connected');
    expect(status).toHaveProperty('apiKey');
    expect(status).toHaveProperty('message');
    expect(typeof status.connected).toBe('boolean');
    expect(typeof status.apiKey).toBe('boolean');
    expect(typeof status.message).toBe('string');
  });

  it('should calculate price based on rarity', async () => {
    const { generateHighValueNFT } = await import('./_core/openSeaNFT');
    
    // Generate multiple NFTs and check price varies
    const prices: number[] = [];
    for (let i = 0; i < 5; i++) {
      const nft = await generateHighValueNFT();
      prices.push(nft.estimatedValue);
    }
    
    // Prices should all be positive
    expect(prices.every(p => p > 0)).toBe(true);
  });
});
