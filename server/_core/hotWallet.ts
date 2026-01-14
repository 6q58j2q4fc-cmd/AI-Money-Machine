/**
 * Server-Side Hot Wallet Service
 * Manages ETH hot wallet for gas fees and on-chain transfers
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { ENV } from './env';

// Network configurations with RPC endpoints
export const NETWORKS = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    decimals: 18,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    decimals: 18,
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    decimals: 18,
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    symbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io',
    decimals: 18,
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    decimals: 18,
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;

// Hot wallet state (in production, use secure key vault)
interface HotWalletState {
  address: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  balances: Record<NetworkId, string>;
  lastBalanceCheck: Date | null;
}

let hotWalletState: HotWalletState | null = null;

// Encryption key derived from JWT_SECRET
function getEncryptionKey(): Buffer {
  const secret = ENV.cookieSecret || 'default-secret-key-change-in-production';
  return crypto.scryptSync(secret, 'hot-wallet-salt', 32);
}

// Encrypt private key for storage
function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  });
}

// Decrypt private key
function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const { iv, encrypted, authTag } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Initialize or get hot wallet
export async function initializeHotWallet(): Promise<{
  address: string;
  isNew: boolean;
}> {
  if (hotWalletState) {
    return { address: hotWalletState.address, isNew: false };
  }
  
  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  
  hotWalletState = {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
    createdAt: new Date(),
    balances: {
      ethereum: '0',
      polygon: '0',
      arbitrum: '0',
      optimism: '0',
      base: '0',
    },
    lastBalanceCheck: null,
  };
  
  console.log(`[HotWallet] Initialized new hot wallet: ${wallet.address}`);
  
  return { address: wallet.address, isNew: true };
}

// Get hot wallet address
export function getHotWalletAddress(): string | null {
  return hotWalletState?.address || null;
}

// Get provider for network
function getProvider(network: NetworkId): ethers.JsonRpcProvider {
  const config = NETWORKS[network];
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

// Get wallet signer for network
function getWalletSigner(network: NetworkId): ethers.Wallet {
  if (!hotWalletState) {
    throw new Error('Hot wallet not initialized');
  }
  
  const privateKey = decryptPrivateKey(hotWalletState.encryptedPrivateKey);
  const provider = getProvider(network);
  return new ethers.Wallet(privateKey, provider);
}

// Check balance on a specific network
export async function checkBalance(network: NetworkId): Promise<{
  balance: string;
  balanceWei: string;
  symbol: string;
}> {
  if (!hotWalletState) {
    await initializeHotWallet();
  }
  
  const provider = getProvider(network);
  const config = NETWORKS[network];
  
  try {
    const balanceWei = await provider.getBalance(hotWalletState!.address);
    const balance = ethers.formatEther(balanceWei);
    
    // Update cached balance
    hotWalletState!.balances[network] = balance;
    hotWalletState!.lastBalanceCheck = new Date();
    
    return {
      balance,
      balanceWei: balanceWei.toString(),
      symbol: config.symbol,
    };
  } catch (error) {
    console.error(`[HotWallet] Error checking ${network} balance:`, error);
    return {
      balance: hotWalletState!.balances[network] || '0',
      balanceWei: '0',
      symbol: config.symbol,
    };
  }
}

// Check balances on all networks
export async function checkAllBalances(): Promise<Record<NetworkId, {
  balance: string;
  balanceWei: string;
  symbol: string;
  network: string;
}>> {
  const results: Record<string, any> = {};
  
  for (const networkId of Object.keys(NETWORKS) as NetworkId[]) {
    const result = await checkBalance(networkId);
    results[networkId] = {
      ...result,
      network: NETWORKS[networkId].name,
    };
  }
  
  return results as Record<NetworkId, any>;
}

// Estimate gas price for a network
export async function estimateGasPrice(network: NetworkId): Promise<{
  gasPrice: string;
  gasPriceGwei: string;
  estimatedTxCost: string;
  estimatedTxCostUsd: number;
}> {
  const provider = getProvider(network);
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
    
    // Estimate cost for a typical NFT transfer (65,000 gas)
    const estimatedGas = BigInt(65000);
    const estimatedCost = gasPrice * estimatedGas;
    const estimatedTxCost = ethers.formatEther(estimatedCost);
    
    // Rough USD estimate (assuming $2000 ETH, $1 MATIC)
    const ethPrice = network === 'polygon' ? 1 : 2000;
    const estimatedTxCostUsd = parseFloat(estimatedTxCost) * ethPrice;
    
    return {
      gasPrice: gasPrice.toString(),
      gasPriceGwei,
      estimatedTxCost,
      estimatedTxCostUsd,
    };
  } catch (error) {
    console.error(`[HotWallet] Error estimating gas for ${network}:`, error);
    return {
      gasPrice: '0',
      gasPriceGwei: '0',
      estimatedTxCost: '0',
      estimatedTxCostUsd: 0,
    };
  }
}

// Find cheapest network for transaction
export async function findCheapestNetwork(): Promise<{
  network: NetworkId;
  estimatedCostUsd: number;
  gasPrice: string;
}> {
  const estimates: Array<{
    network: NetworkId;
    estimatedCostUsd: number;
    gasPrice: string;
  }> = [];
  
  for (const networkId of Object.keys(NETWORKS) as NetworkId[]) {
    const estimate = await estimateGasPrice(networkId);
    estimates.push({
      network: networkId,
      estimatedCostUsd: estimate.estimatedTxCostUsd,
      gasPrice: estimate.gasPriceGwei,
    });
  }
  
  // Sort by cost and return cheapest
  estimates.sort((a, b) => a.estimatedCostUsd - b.estimatedCostUsd);
  return estimates[0];
}

// Send ETH transaction
export async function sendTransaction(params: {
  network: NetworkId;
  to: string;
  amount: string; // in ETH
  data?: string;
}): Promise<{
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}> {
  if (!hotWalletState) {
    return { success: false, error: 'Hot wallet not initialized' };
  }
  
  const { network, to, amount, data } = params;
  const config = NETWORKS[network];
  
  try {
    const wallet = getWalletSigner(network);
    const provider = getProvider(network);
    
    // Check balance first
    const balance = await provider.getBalance(hotWalletState.address);
    const amountWei = ethers.parseEther(amount);
    
    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: hotWalletState.address,
      to,
      value: amountWei,
      data: data || '0x',
    });
    
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const totalCost = amountWei + (gasEstimate * gasPrice);
    
    if (balance < totalCost) {
      return {
        success: false,
        error: `Insufficient balance. Need ${ethers.formatEther(totalCost)} ${config.symbol}, have ${ethers.formatEther(balance)} ${config.symbol}`,
      };
    }
    
    // Send transaction
    console.log(`[HotWallet] Sending ${amount} ${config.symbol} to ${to} on ${network}`);
    
    const tx = await wallet.sendTransaction({
      to,
      value: amountWei,
      data: data || '0x',
      gasLimit: gasEstimate,
      gasPrice,
    });
    
    console.log(`[HotWallet] Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait(1);
    
    console.log(`[HotWallet] Transaction confirmed in block ${receipt?.blockNumber}`);
    
    return {
      success: true,
      transactionHash: tx.hash,
      explorerUrl: `${config.explorer}/tx/${tx.hash}`,
      gasUsed: receipt?.gasUsed?.toString(),
      effectiveGasPrice: receipt?.gasPrice?.toString(),
    };
  } catch (error: any) {
    console.error(`[HotWallet] Transaction error:`, error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

// Transfer NFT (ERC-721)
export async function transferNFT(params: {
  network: NetworkId;
  contractAddress: string;
  tokenId: string;
  to: string;
}): Promise<{
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
}> {
  if (!hotWalletState) {
    return { success: false, error: 'Hot wallet not initialized' };
  }
  
  const { network, contractAddress, tokenId, to } = params;
  const config = NETWORKS[network];
  
  try {
    const wallet = getWalletSigner(network);
    
    // ERC-721 ABI for transferFrom
    const abi = [
      'function transferFrom(address from, address to, uint256 tokenId)',
      'function safeTransferFrom(address from, address to, uint256 tokenId)',
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    console.log(`[HotWallet] Transferring NFT ${tokenId} from ${contractAddress} to ${to}`);
    
    const tx = await contract.safeTransferFrom(
      hotWalletState.address,
      to,
      tokenId
    );
    
    const receipt = await tx.wait(1);
    
    return {
      success: true,
      transactionHash: tx.hash,
      explorerUrl: `${config.explorer}/tx/${tx.hash}`,
    };
  } catch (error: any) {
    console.error(`[HotWallet] NFT transfer error:`, error);
    return {
      success: false,
      error: error.message || 'NFT transfer failed',
    };
  }
}

// Get deposit instructions
export function getDepositInstructions(): {
  address: string;
  networks: Array<{
    id: NetworkId;
    name: string;
    symbol: string;
    minDeposit: string;
  }>;
  warnings: string[];
} {
  if (!hotWalletState) {
    throw new Error('Hot wallet not initialized');
  }
  
  return {
    address: hotWalletState.address,
    networks: [
      { id: 'ethereum', name: 'Ethereum Mainnet', symbol: 'ETH', minDeposit: '0.01' },
      { id: 'polygon', name: 'Polygon', symbol: 'MATIC', minDeposit: '1' },
      { id: 'arbitrum', name: 'Arbitrum One', symbol: 'ETH', minDeposit: '0.005' },
      { id: 'optimism', name: 'Optimism', symbol: 'ETH', minDeposit: '0.005' },
      { id: 'base', name: 'Base', symbol: 'ETH', minDeposit: '0.005' },
    ],
    warnings: [
      'Only send the correct token to the correct network',
      'Sending tokens to the wrong network may result in permanent loss',
      'Minimum deposits apply to cover gas fees',
      'Deposits typically confirm within 1-5 minutes',
    ],
  };
}

// Get hot wallet status
export async function getHotWalletStatus(): Promise<{
  initialized: boolean;
  address: string | null;
  balances: Record<NetworkId, { balance: string; symbol: string }>;
  totalValueUsd: number;
  lastBalanceCheck: Date | null;
  canExecuteTransactions: boolean;
  lowBalanceWarnings: string[];
}> {
  if (!hotWalletState) {
    await initializeHotWallet();
  }
  
  // Refresh balances
  const balances = await checkAllBalances();
  
  // Calculate total value (rough estimate)
  let totalValueUsd = 0;
  const ethPrice = 2000;
  const maticPrice = 1;
  
  for (const [networkId, data] of Object.entries(balances)) {
    const price = networkId === 'polygon' ? maticPrice : ethPrice;
    totalValueUsd += parseFloat(data.balance) * price;
  }
  
  // Check for low balances
  const lowBalanceWarnings: string[] = [];
  const minBalances: Record<NetworkId, number> = {
    ethereum: 0.01,
    polygon: 1,
    arbitrum: 0.005,
    optimism: 0.005,
    base: 0.005,
  };
  
  for (const [networkId, data] of Object.entries(balances)) {
    const minBalance = minBalances[networkId as NetworkId];
    if (parseFloat(data.balance) < minBalance) {
      lowBalanceWarnings.push(
        `Low ${data.symbol} balance on ${NETWORKS[networkId as NetworkId].name}: ${data.balance} (min: ${minBalance})`
      );
    }
  }
  
  // Can execute if any network has sufficient balance
  const canExecuteTransactions = Object.entries(balances).some(([networkId, data]) => {
    const minBalance = minBalances[networkId as NetworkId];
    return parseFloat(data.balance) >= minBalance;
  });
  
  return {
    initialized: true,
    address: hotWalletState!.address,
    balances: Object.fromEntries(
      Object.entries(balances).map(([k, v]) => [k, { balance: v.balance, symbol: v.symbol }])
    ) as Record<NetworkId, { balance: string; symbol: string }>,
    totalValueUsd,
    lastBalanceCheck: hotWalletState!.lastBalanceCheck,
    canExecuteTransactions,
    lowBalanceWarnings,
  };
}

// Export network list
export function getNetworkList(): Array<{
  id: NetworkId;
  name: string;
  symbol: string;
  explorer: string;
  chainId: number;
}> {
  return Object.entries(NETWORKS).map(([id, config]) => ({
    id: id as NetworkId,
    name: config.name,
    symbol: config.symbol,
    explorer: config.explorer,
    chainId: config.chainId,
  }));
}


// Transaction history storage (in production, use database)
interface TransactionRecord {
  type: 'deposit' | 'withdraw' | 'send' | 'nft_transfer';
  network: NetworkId;
  txHash: string;
  amount: string;
  symbol: string;
  to?: string;
  from?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl: string;
}

const transactionHistory: TransactionRecord[] = [];

// Add transaction to history
export function addTransactionToHistory(tx: Omit<TransactionRecord, 'timestamp'>): void {
  transactionHistory.unshift({
    ...tx,
    timestamp: new Date(),
  });
  
  // Keep only last 100 transactions
  if (transactionHistory.length > 100) {
    transactionHistory.pop();
  }
}

// Get transaction history
export function getTransactionHistory(limit: number = 50): TransactionRecord[] {
  return transactionHistory.slice(0, limit);
}

// Withdraw to Trust Wallet (convenience function)
export async function withdrawToTrustWallet(params: {
  network: NetworkId;
  amount: string;
  toAddress: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}> {
  const { network, amount, toAddress } = params;
  
  console.log(`[HotWallet] Withdrawing ${amount} to Trust Wallet: ${toAddress} on ${network}`);
  
  const result = await sendTransaction({
    network,
    to: toAddress,
    amount,
  });
  
  if (result.success && result.transactionHash) {
    // Add to history
    addTransactionToHistory({
      type: 'withdraw',
      network,
      txHash: result.transactionHash,
      amount,
      symbol: NETWORKS[network].symbol,
      to: toAddress,
      from: hotWalletState?.address,
      status: 'confirmed',
      explorerUrl: result.explorerUrl || '',
    });
  }
  
  return {
    success: result.success,
    txHash: result.transactionHash,
    explorerUrl: result.explorerUrl,
    error: result.error,
  };
}

// Check if hot wallet has sufficient balance for gas
export function canPayGas(network: NetworkId): boolean {
  if (!hotWalletState) return false;
  
  const balance = parseFloat(hotWalletState.balances[network] || '0');
  const minGasBalance: Record<NetworkId, number> = {
    ethereum: 0.005, // ~$10 at $2000/ETH
    polygon: 0.1,    // ~$0.10 at $1/MATIC
    arbitrum: 0.001, // ~$2 at $2000/ETH
    optimism: 0.001, // ~$2 at $2000/ETH
    base: 0.001,     // ~$2 at $2000/ETH
  };
  
  return balance >= minGasBalance[network];
}

// Get recommended funding amounts
export function getRecommendedFunding(): Record<NetworkId, {
  minAmount: string;
  recommendedAmount: string;
  symbol: string;
  estimatedTxCount: number;
}> {
  return {
    ethereum: {
      minAmount: '0.01',
      recommendedAmount: '0.05',
      symbol: 'ETH',
      estimatedTxCount: 10,
    },
    polygon: {
      minAmount: '1',
      recommendedAmount: '5',
      symbol: 'MATIC',
      estimatedTxCount: 100,
    },
    arbitrum: {
      minAmount: '0.005',
      recommendedAmount: '0.02',
      symbol: 'ETH',
      estimatedTxCount: 20,
    },
    optimism: {
      minAmount: '0.005',
      recommendedAmount: '0.02',
      symbol: 'ETH',
      estimatedTxCount: 20,
    },
    base: {
      minAmount: '0.005',
      recommendedAmount: '0.02',
      symbol: 'ETH',
      estimatedTxCount: 20,
    },
  };
}
