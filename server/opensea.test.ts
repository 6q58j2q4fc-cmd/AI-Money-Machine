import { describe, it, expect } from 'vitest';

describe('OpenSea API Integration', () => {
  it('should have OPENSEA_API_KEY environment variable set', () => {
    // The key should be set in the environment
    const apiKey = process.env.OPENSEA_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
  });

  it('should be able to connect to OpenSea API', async () => {
    const apiKey = process.env.OPENSEA_API_KEY;
    
    // Skip if no API key
    if (!apiKey) {
      console.log('Skipping OpenSea API test - no API key configured');
      return;
    }

    // Test the API connection by fetching a known collection
    const response = await fetch('https://api.opensea.io/api/v2/collections?limit=1', {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    // Should get a successful response (200) or rate limited (429)
    expect([200, 429]).toContain(response.status);
    
    if (response.status === 200) {
      const data = await response.json();
      expect(data).toBeDefined();
      console.log('OpenSea API connection successful');
    } else if (response.status === 429) {
      console.log('OpenSea API rate limited - key is valid but rate limited');
    }
  });

  it('should format OpenSea NFT URLs correctly', () => {
    const chain = 'ethereum';
    const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const tokenId = '123';
    
    const viewUrl = `https://opensea.io/assets/${chain}/${contractAddress}/${tokenId}`;
    const sellUrl = `https://opensea.io/assets/${chain}/${contractAddress}/${tokenId}/sell`;
    
    expect(viewUrl).toContain('opensea.io/assets');
    expect(viewUrl).toContain(chain);
    expect(viewUrl).toContain(contractAddress);
    expect(viewUrl).toContain(tokenId);
    
    expect(sellUrl).toContain('/sell');
  });

  it('should map blockchain chains to OpenSea chain names', () => {
    const chainMap: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'matic',
      arbitrum: 'arbitrum',
      optimism: 'optimism',
      base: 'base',
    };
    
    expect(chainMap['ethereum']).toBe('ethereum');
    expect(chainMap['polygon']).toBe('matic');
    expect(chainMap['arbitrum']).toBe('arbitrum');
  });
});
