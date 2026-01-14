import { describe, it, expect, vi } from 'vitest';
import {
  NFT_CATEGORIES,
  MARKETPLACES,
  AUTO_BUYER_PLATFORMS,
  getCategories,
  getMarketplaces,
  getAutoBuyerPlatforms,
} from './_core/realNftService';

describe('Real NFT Service', () => {
  describe('NFT Categories', () => {
    it('should have multiple NFT categories', () => {
      expect(Object.keys(NFT_CATEGORIES).length).toBeGreaterThan(0);
    });

    it('should have required properties for each category', () => {
      Object.values(NFT_CATEGORIES).forEach((category) => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('basePrice');
        expect(category).toHaveProperty('prompts');
        expect(Array.isArray(category.prompts)).toBe(true);
        expect(category.prompts.length).toBeGreaterThan(0);
      });
    });

    it('should return categories via getCategories', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach((cat) => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('basePrice');
      });
    });
  });

  describe('Marketplaces', () => {
    it('should have multiple marketplaces', () => {
      expect(Object.keys(MARKETPLACES).length).toBeGreaterThan(0);
    });

    it('should have required properties for each marketplace', () => {
      Object.values(MARKETPLACES).forEach((marketplace) => {
        expect(marketplace).toHaveProperty('name');
        expect(marketplace).toHaveProperty('baseUrl');
        expect(marketplace).toHaveProperty('fee');
        expect(typeof marketplace.fee).toBe('number');
        expect(marketplace.fee).toBeGreaterThanOrEqual(0);
        expect(marketplace.fee).toBeLessThan(1);
      });
    });

    it('should return marketplaces via getMarketplaces', () => {
      const marketplaces = getMarketplaces();
      expect(Array.isArray(marketplaces)).toBe(true);
      expect(marketplaces.length).toBeGreaterThan(0);
      marketplaces.forEach((mp) => {
        expect(mp).toHaveProperty('id');
        expect(mp).toHaveProperty('name');
        expect(mp).toHaveProperty('baseUrl');
        expect(mp).toHaveProperty('fee');
      });
    });

    it('should include OpenSea marketplace', () => {
      const marketplaces = getMarketplaces();
      const opensea = marketplaces.find(mp => mp.name === 'OpenSea');
      expect(opensea).toBeDefined();
      expect(opensea?.baseUrl).toContain('opensea.io');
    });
  });

  describe('Auto-Buyer Platforms', () => {
    it('should have multiple auto-buyer platforms', () => {
      expect(Object.keys(AUTO_BUYER_PLATFORMS).length).toBeGreaterThan(0);
    });

    it('should have required properties for each platform', () => {
      Object.values(AUTO_BUYER_PLATFORMS).forEach((platform) => {
        expect(platform).toHaveProperty('name');
        expect(platform).toHaveProperty('url');
        expect(platform).toHaveProperty('type');
        expect(platform).toHaveProperty('avgPrice');
        expect(platform).toHaveProperty('currency');
        expect(typeof platform.avgPrice).toBe('number');
      });
    });

    it('should return platforms via getAutoBuyerPlatforms', () => {
      const platforms = getAutoBuyerPlatforms();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
      platforms.forEach((p) => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('url');
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('avgPrice');
      });
    });
  });

  describe('Price Calculations', () => {
    it('should have reasonable base prices for categories', () => {
      Object.values(NFT_CATEGORIES).forEach((category) => {
        expect(category.basePrice).toBeGreaterThan(0);
        expect(category.basePrice).toBeLessThan(100); // Reasonable upper bound
      });
    });

    it('should have reasonable marketplace fees', () => {
      Object.values(MARKETPLACES).forEach((marketplace) => {
        expect(marketplace.fee).toBeGreaterThanOrEqual(0);
        expect(marketplace.fee).toBeLessThanOrEqual(0.15); // Max 15% fee
      });
    });

    it('should have reasonable auto-buyer prices', () => {
      Object.values(AUTO_BUYER_PLATFORMS).forEach((platform) => {
        expect(platform.avgPrice).toBeGreaterThan(0);
        expect(platform.avgPrice).toBeLessThan(1000); // Reasonable upper bound
      });
    });
  });

  describe('URL Validation', () => {
    it('should have valid marketplace URLs', () => {
      Object.values(MARKETPLACES).forEach((marketplace) => {
        expect(marketplace.baseUrl).toMatch(/^https?:\/\//);
      });
    });

    it('should have valid auto-buyer platform URLs', () => {
      Object.values(AUTO_BUYER_PLATFORMS).forEach((platform) => {
        expect(platform.url).toMatch(/^https?:\/\//);
      });
    });
  });
});
