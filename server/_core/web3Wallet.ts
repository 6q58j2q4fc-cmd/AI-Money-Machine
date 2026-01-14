/**
 * Web3 Wallet Integration Service
 * Handles MetaMask, WalletConnect, and on-chain NFT operations
 */

import { ethers } from 'ethers';

// Chain configurations
export const CHAINS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon.llamarpc.com',
    explorer: 'https://polygonscan.com',
    currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  }
};

// ERC-721 ABI for NFT operations
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)'
];

// ERC-1155 ABI for batch NFT operations
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function uri(uint256 id) view returns (string)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
];

// Types
export interface WalletBalance {
  address: string;
  chain: string;
  balance: string;
  balanceFormatted: string;
  currency: string;
}

export interface NFTBalance {
  contractAddress: string;
  tokenId: string;
  balance: number;
  name?: string;
  symbol?: string;
  tokenUri?: string;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  explorerUrl: string;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: string;
  estimatedCostUsd?: number;
}

// Web3 Wallet Service
export const web3WalletService = {
  // Get provider for a chain
  getProvider(chainKey: keyof typeof CHAINS = 'ethereum'): ethers.JsonRpcProvider {
    const chain = CHAINS[chainKey];
    return new ethers.JsonRpcProvider(chain.rpcUrl);
  },

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  },

  // Get wallet balance across chains
  async getMultiChainBalance(address: string): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];

    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      try {
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const balance = await provider.getBalance(address);
        
        balances.push({
          address,
          chain: chain.name,
          balance: balance.toString(),
          balanceFormatted: ethers.formatEther(balance),
          currency: chain.currency.symbol
        });
      } catch (error) {
        console.error(`Failed to get balance on ${chain.name}:`, error);
        balances.push({
          address,
          chain: chain.name,
          balance: '0',
          balanceFormatted: '0.0',
          currency: chain.currency.symbol
        });
      }
    }

    return balances;
  },

  // Get single chain balance
  async getBalance(address: string, chainKey: keyof typeof CHAINS = 'ethereum'): Promise<WalletBalance> {
    const chain = CHAINS[chainKey];
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    
    try {
      const balance = await provider.getBalance(address);
      return {
        address,
        chain: chain.name,
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance),
        currency: chain.currency.symbol
      };
    } catch (error) {
      console.error(`Failed to get balance:`, error);
      return {
        address,
        chain: chain.name,
        balance: '0',
        balanceFormatted: '0.0',
        currency: chain.currency.symbol
      };
    }
  },

  // Get NFT balance for ERC-721
  async getNFTBalance(
    walletAddress: string,
    contractAddress: string,
    chainKey: keyof typeof CHAINS = 'ethereum'
  ): Promise<number> {
    try {
      const provider = this.getProvider(chainKey);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      return Number(balance);
    } catch (error) {
      console.error('Failed to get NFT balance:', error);
      return 0;
    }
  },

  // Check NFT ownership
  async checkNFTOwnership(
    contractAddress: string,
    tokenId: string,
    chainKey: keyof typeof CHAINS = 'ethereum'
  ): Promise<string | null> {
    try {
      const provider = this.getProvider(chainKey);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      const owner = await contract.ownerOf(tokenId);
      return owner;
    } catch (error) {
      console.error('Failed to check NFT ownership:', error);
      return null;
    }
  },

  // Get NFT metadata
  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    chainKey: keyof typeof CHAINS = 'ethereum'
  ): Promise<{ name: string; symbol: string; tokenUri: string } | null> {
    try {
      const provider = this.getProvider(chainKey);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      
      const [name, symbol, tokenUri] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.tokenURI(tokenId)
      ]);

      return { name, symbol, tokenUri };
    } catch (error) {
      console.error('Failed to get NFT metadata:', error);
      return null;
    }
  },

  // Estimate gas for NFT transfer
  async estimateNFTTransferGas(
    contractAddress: string,
    from: string,
    to: string,
    tokenId: string,
    chainKey: keyof typeof CHAINS = 'ethereum'
  ): Promise<GasEstimate | null> {
    try {
      const provider = this.getProvider(chainKey);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      
      // Estimate gas limit
      const gasLimit = await contract.transferFrom.estimateGas(from, to, tokenId);
      
      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      
      // Calculate estimated cost
      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas: feeData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
        estimatedCost: ethers.formatEther(estimatedCost)
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return null;
    }
  },

  // Generate transfer transaction data (for frontend signing)
  generateTransferData(
    contractAddress: string,
    from: string,
    to: string,
    tokenId: string
  ): { to: string; data: string } {
    const iface = new ethers.Interface(ERC721_ABI);
    const data = iface.encodeFunctionData('transferFrom', [from, to, tokenId]);
    
    return {
      to: contractAddress,
      data
    };
  },

  // Generate batch transfer data for ERC-1155
  generateBatchTransferData(
    contractAddress: string,
    from: string,
    to: string,
    tokenIds: string[],
    amounts: number[]
  ): { to: string; data: string } {
    const iface = new ethers.Interface(ERC1155_ABI);
    const data = iface.encodeFunctionData('safeBatchTransferFrom', [
      from,
      to,
      tokenIds,
      amounts,
      '0x'
    ]);
    
    return {
      to: contractAddress,
      data
    };
  },

  // Get transaction status
  async getTransactionStatus(
    txHash: string,
    chainKey: keyof typeof CHAINS = 'ethereum'
  ): Promise<TransactionResult> {
    const chain = CHAINS[chainKey];
    const provider = this.getProvider(chainKey);
    
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          hash: txHash,
          status: 'pending',
          explorerUrl: `${chain.explorer}/tx/${txHash}`
        };
      }

      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${chain.explorer}/tx/${txHash}`
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return {
        hash: txHash,
        status: 'pending',
        explorerUrl: `${chain.explorer}/tx/${txHash}`
      };
    }
  },

  // Wait for transaction confirmation
  async waitForTransaction(
    txHash: string,
    chainKey: keyof typeof CHAINS = 'ethereum',
    confirmations: number = 1
  ): Promise<TransactionResult> {
    const chain = CHAINS[chainKey];
    const provider = this.getProvider(chainKey);
    
    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${chain.explorer}/tx/${txHash}`
      };
    } catch (error) {
      console.error('Failed to wait for transaction:', error);
      return {
        hash: txHash,
        status: 'failed',
        explorerUrl: `${chain.explorer}/tx/${txHash}`
      };
    }
  },

  // Get current gas prices
  async getGasPrices(chainKey: keyof typeof CHAINS = 'ethereum'): Promise<{
    slow: string;
    standard: string;
    fast: string;
  }> {
    try {
      const provider = this.getProvider(chainKey);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      
      // Calculate different speed tiers
      const slow = gasPrice * BigInt(80) / BigInt(100);
      const fast = gasPrice * BigInt(120) / BigInt(100);

      return {
        slow: ethers.formatUnits(slow, 'gwei'),
        standard: ethers.formatUnits(gasPrice, 'gwei'),
        fast: ethers.formatUnits(fast, 'gwei')
      };
    } catch (error) {
      console.error('Failed to get gas prices:', error);
      return {
        slow: '0',
        standard: '0',
        fast: '0'
      };
    }
  },

  // Format address for display
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  // Convert ETH to Wei
  toWei(eth: string): bigint {
    return ethers.parseEther(eth);
  },

  // Convert Wei to ETH
  fromWei(wei: bigint | string): string {
    return ethers.formatEther(wei);
  }
};

// Frontend wallet connection helpers (for client-side use)
export const walletConnectionHelpers = {
  // Check if MetaMask is available
  isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask;
  },

  // Get connected accounts (client-side)
  async getConnectedAccounts(): Promise<string[]> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return [];
    }
    
    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_accounts'
      });
      return accounts || [];
    } catch {
      return [];
    }
  },

  // Request account connection (client-side)
  async requestConnection(): Promise<string[]> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not available');
    }
    
    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    });
    return accounts;
  },

  // Switch chain (client-side)
  async switchChain(chainId: number): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not available');
    }
    
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    });
  },

  // Sign and send transaction (client-side)
  async sendTransaction(params: {
    to: string;
    data: string;
    value?: string;
    from: string;
  }): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not available');
    }
    
    const txHash = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        to: params.to,
        data: params.data,
        value: params.value || '0x0',
        from: params.from
      }]
    });
    
    return txHash;
  }
};

export default web3WalletService;
