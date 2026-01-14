import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeHotWallet,
  getHotWalletAddress,
  getHotWalletStatus,
  getDepositInstructions,
  getNetworkList,
} from './_core/hotWallet';

// Mock ethers to avoid network calls
vi.mock('ethers', () => ({
  ethers: {
    Wallet: {
      createRandom: () => ({
        address: '0x1234567890123456789012345678901234567890',
        privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      }),
    },
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
    })),
    formatEther: (val: bigint) => (Number(val) / 1e18).toString(),
  },
}));

describe('Hot Wallet Service', () => {
  describe('initializeHotWallet', () => {
    it('should initialize a new hot wallet', async () => {
      const result = await initializeHotWallet();
      
      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('getHotWalletAddress', () => {
    it('should return the hot wallet address after initialization', async () => {
      await initializeHotWallet();
      const address = getHotWalletAddress();
      
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('getHotWalletStatus', () => {
    it('should return wallet status with balances', async () => {
      await initializeHotWallet();
      const status = await getHotWalletStatus();
      
      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(status.address).toBeDefined();
      expect(status.balances).toBeDefined();
      expect(typeof status.totalValueUsd).toBe('number');
    }, 30000);

    it('should include balance for each network', async () => {
      await initializeHotWallet();
      const status = await getHotWalletStatus();
      
      expect(status.balances).toBeDefined();
      expect(Object.keys(status.balances).length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('getDepositInstructions', () => {
    it('should return deposit instructions with address and networks', async () => {
      await initializeHotWallet();
      const instructions = getDepositInstructions();
      
      expect(instructions).toBeDefined();
      expect(instructions.address).toBeDefined();
      expect(instructions.networks).toBeDefined();
      expect(Array.isArray(instructions.networks)).toBe(true);
      expect(instructions.networks.length).toBeGreaterThan(0);
      expect(instructions.warnings).toBeDefined();
      expect(Array.isArray(instructions.warnings)).toBe(true);
    });

    it('should include network details in deposit instructions', async () => {
      await initializeHotWallet();
      const instructions = getDepositInstructions();
      
      const network = instructions.networks[0];
      expect(network.id).toBeDefined();
      expect(network.name).toBeDefined();
      expect(network.symbol).toBeDefined();
      expect(network.minDeposit).toBeDefined();
    });
  });

  describe('getNetworkList', () => {
    it('should return list of supported networks', () => {
      const networks = getNetworkList();
      
      expect(networks).toBeDefined();
      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0);
    });

    it('should include ethereum network', () => {
      const networks = getNetworkList();
      const ethereum = networks.find(n => n.id === 'ethereum');
      
      expect(ethereum).toBeDefined();
      expect(ethereum?.name).toContain('Ethereum');
      expect(ethereum?.symbol).toBe('ETH');
    });

    it('should include polygon network', () => {
      const networks = getNetworkList();
      const polygon = networks.find(n => n.id === 'polygon');
      
      expect(polygon).toBeDefined();
      expect(polygon?.name).toContain('Polygon');
      expect(polygon?.symbol).toBe('MATIC');
    });
  });

  describe('Network Configuration', () => {
    it('should have multiple networks available', () => {
      const networks = getNetworkList();
      expect(networks.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid network properties', () => {
      const networks = getNetworkList();
      networks.forEach(network => {
        expect(network.id).toBeDefined();
        expect(network.name).toBeDefined();
        expect(network.symbol).toBeDefined();
      });
    });

    it('should include major networks', () => {
      const networks = getNetworkList();
      const networkIds = networks.map(n => n.id);
      expect(networkIds).toContain('ethereum');
      expect(networkIds).toContain('polygon');
    });
  });
});
