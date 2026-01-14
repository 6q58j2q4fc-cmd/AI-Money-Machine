/**
 * Server-Side Hot Wallet Service
 * Manages ETH hot wallet for gas fees and on-chain transfers
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { ENV } from './env';
import { getDb } from '../db';
import { systemHotWallet, cryptoTransactionLog } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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

// Initialize or get hot wallet - NOW PERSISTED TO DATABASE
export async function initializeHotWallet(): Promise<{
  address: string;
  isNew: boolean;
}> {
  // Return cached state if available
  if (hotWalletState) {
    return { address: hotWalletState.address, isNew: false };
  }
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available for hot wallet initialization');
  }
  
  // Try to load existing wallet from database
  const existingWallets = await db.select().from(systemHotWallet).where(eq(systemHotWallet.isActive, true)).limit(1);
  
  if (existingWallets.length > 0) {
    const existing = existingWallets[0];
    
    // Reconstruct encrypted data format
    const encryptedData = JSON.stringify({
      iv: existing.encryptionIv,
      encrypted: existing.encryptedPrivateKey,
      authTag: existing.encryptionAuthTag,
    });
    
    hotWalletState = {
      address: existing.address,
      encryptedPrivateKey: encryptedData,
      createdAt: existing.createdAt,
      balances: {
        ethereum: existing.balanceEthereum || '0',
        polygon: existing.balancePolygon || '0',
        arbitrum: existing.balanceArbitrum || '0',
        optimism: existing.balanceOptimism || '0',
        base: existing.balanceBase || '0',
      },
      lastBalanceCheck: existing.lastBalanceCheck,
    };
    
    console.log(`[HotWallet] Loaded existing hot wallet from database: ${existing.address}`);
    return { address: existing.address, isNew: false };
  }
  
  // Generate new wallet and persist to database
  const wallet = ethers.Wallet.createRandom();
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(wallet.privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Save to database
  await db.insert(systemHotWallet).values({
    address: wallet.address,
    encryptedPrivateKey: encrypted,
    encryptionIv: iv.toString('hex'),
    encryptionAuthTag: authTag.toString('hex'),
    isActive: true,
    balanceEthereum: '0',
    balancePolygon: '0',
    balanceArbitrum: '0',
    balanceOptimism: '0',
    balanceBase: '0',
  });
  
  const encryptedData = JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  });
  
  hotWalletState = {
    address: wallet.address,
    encryptedPrivateKey: encryptedData,
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
  
  console.log(`[HotWallet] Created and persisted new hot wallet: ${wallet.address}`);
  
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

// Get in-memory transaction history (legacy)
export function getInMemoryTransactionHistory(limit: number = 50): TransactionRecord[] {
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


// Import existing wallet from private key
export async function importWalletFromPrivateKey(privateKey: string): Promise<{
  success: boolean;
  address?: string;
  error?: string;
}> {
  try {
    // Validate private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    // Deactivate any existing wallets
    await db.update(systemHotWallet)
      .set({ isActive: false })
      .where(eq(systemHotWallet.isActive, true));
    
    // Encrypt and store the new wallet
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Save to database
    await db.insert(systemHotWallet).values({
      address: wallet.address,
      encryptedPrivateKey: encrypted,
      encryptionIv: iv.toString('hex'),
      encryptionAuthTag: authTag.toString('hex'),
      isActive: true,
      balanceEthereum: '0',
      balancePolygon: '0',
      balanceArbitrum: '0',
      balanceOptimism: '0',
      balanceBase: '0',
    });
    
    // Update in-memory state
    const encryptedData = JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    });
    
    hotWalletState = {
      address: wallet.address,
      encryptedPrivateKey: encryptedData,
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
    
    console.log(`[HotWallet] Imported wallet: ${wallet.address}`);
    
    // Refresh balances
    await checkAllBalances();
    
    return { success: true, address: wallet.address };
  } catch (error: any) {
    console.error('[HotWallet] Import error:', error);
    return { success: false, error: error.message || 'Invalid private key' };
  }
}

// Log a transaction to the database
export async function logTransaction(params: {
  txHash: string;
  direction: 'incoming' | 'outgoing';
  txType: 'deposit' | 'withdrawal' | 'nft_mint' | 'nft_sale' | 'gas_fee' | 'transfer' | 'contract_deploy';
  network: NetworkId;
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountFormatted: string;
  currency: string;
  usdValue?: number;
  description?: string;
  userId?: number;
  nftAssetId?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    const config = NETWORKS[params.network];
    const explorerUrl = `${config.explorer}/tx/${params.txHash}`;
    
    const result = await db.insert(cryptoTransactionLog).values({
      txHash: params.txHash,
      direction: params.direction,
      txType: params.txType,
      network: params.network,
      chainId: config.chainId,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      amount: params.amount,
      amountFormatted: params.amountFormatted,
      currency: params.currency,
      usdValue: params.usdValue?.toString(),
      explorerUrl,
      status: 'pending',
      confirmations: 0,
      requiredConfirmations: 12,
      firstSeenAt: new Date(),
      description: params.description,
      userId: params.userId,
      nftAssetId: params.nftAssetId,
      metadata: params.metadata,
    });
    
    console.log(`[HotWallet] Logged transaction: ${params.txHash}`);
    
    return { success: true, id: (result as any)[0]?.insertId || 0 };
  } catch (error: any) {
    console.error('[HotWallet] Error logging transaction:', error);
    return { success: false, error: error.message };
  }
}

// Verify transaction on blockchain
export async function verifyTransaction(txHash: string, network: NetworkId): Promise<{
  verified: boolean;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed' | 'dropped';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
}> {
  try {
    const provider = getProvider(network);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      // Transaction not yet mined
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        return { verified: false, status: 'dropped', confirmations: 0, error: 'Transaction not found' };
      }
      return { verified: true, status: 'pending', confirmations: 0 };
    }
    
    // Get current block for confirmation count
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    
    // Check if transaction succeeded
    if (receipt.status === 0) {
      return {
        verified: true,
        status: 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
        error: 'Transaction reverted',
      };
    }
    
    // Determine status based on confirmations
    const status = confirmations >= 12 ? 'confirmed' : 'confirming';
    
    return {
      verified: true,
      status,
      confirmations,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString(),
    };
  } catch (error: any) {
    console.error('[HotWallet] Error verifying transaction:', error);
    return { verified: false, status: 'pending', confirmations: 0, error: error.message };
  }
}

// Update transaction status in database
export async function updateTransactionStatus(txHash: string, network: NetworkId): Promise<{
  success: boolean;
  status?: string;
  confirmations?: number;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    const verification = await verifyTransaction(txHash, network);
    
    if (!verification.verified) {
      return { success: false, error: verification.error };
    }
    
    await db.update(cryptoTransactionLog)
      .set({
        status: verification.status,
        confirmations: verification.confirmations,
        blockNumber: verification.blockNumber,
        gasUsed: verification.gasUsed,
        gasPrice: verification.effectiveGasPrice,
        confirmedAt: verification.status === 'confirmed' ? new Date() : undefined,
        errorMessage: verification.error,
      })
      .where(eq(cryptoTransactionLog.txHash, txHash));
    
    return {
      success: true,
      status: verification.status,
      confirmations: verification.confirmations,
    };
  } catch (error: any) {
    console.error('[HotWallet] Error updating transaction status:', error);
    return { success: false, error: error.message };
  }
}

// Get transaction history from database
export async function getTransactionHistory(params?: {
  limit?: number;
  offset?: number;
  direction?: 'incoming' | 'outgoing';
  network?: NetworkId;
  status?: string;
}): Promise<{
  transactions: Array<{
    id: number;
    txHash: string;
    direction: string;
    txType: string;
    network: string;
    fromAddress: string;
    toAddress: string;
    amountFormatted: string;
    currency: string;
    usdValue: string | null;
    status: string;
    confirmations: number;
    explorerUrl: string | null;
    description: string | null;
    createdAt: Date;
  }>;
  total: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { transactions: [], total: 0 };
    }
    
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    
    // Get transactions
    const transactions = await db.select({
      id: cryptoTransactionLog.id,
      txHash: cryptoTransactionLog.txHash,
      direction: cryptoTransactionLog.direction,
      txType: cryptoTransactionLog.txType,
      network: cryptoTransactionLog.network,
      fromAddress: cryptoTransactionLog.fromAddress,
      toAddress: cryptoTransactionLog.toAddress,
      amountFormatted: cryptoTransactionLog.amountFormatted,
      currency: cryptoTransactionLog.currency,
      usdValue: cryptoTransactionLog.usdValue,
      status: cryptoTransactionLog.status,
      confirmations: cryptoTransactionLog.confirmations,
      explorerUrl: cryptoTransactionLog.explorerUrl,
      description: cryptoTransactionLog.description,
      createdAt: cryptoTransactionLog.createdAt,
    })
      .from(cryptoTransactionLog)
      .orderBy(cryptoTransactionLog.createdAt)
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const countResult = await db.select({ count: cryptoTransactionLog.id })
      .from(cryptoTransactionLog);
    
    return {
      transactions: transactions.map(tx => ({
        ...tx,
        txHash: tx.txHash || '',
        usdValue: tx.usdValue?.toString() || null,
        confirmations: tx.confirmations || 0,
      })),
      total: countResult.length,
    };
  } catch (error: any) {
    console.error('[HotWallet] Error getting transaction history:', error);
    return { transactions: [], total: 0 };
  }
}

// Send transaction with logging
export async function sendTransactionWithLogging(params: {
  network: NetworkId;
  to: string;
  amount: string;
  description?: string;
  userId?: number;
}): Promise<{
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
}> {
  const result = await sendTransaction(params);
  
  if (result.success && result.transactionHash && hotWalletState) {
    // Log the transaction
    const config = NETWORKS[params.network];
    const ethPrice = params.network === 'polygon' ? 1 : 2000;
    const usdValue = parseFloat(params.amount) * ethPrice;
    
    await logTransaction({
      txHash: result.transactionHash,
      direction: 'outgoing',
      txType: 'transfer',
      network: params.network,
      fromAddress: hotWalletState.address,
      toAddress: params.to,
      amount: ethers.parseEther(params.amount).toString(),
      amountFormatted: params.amount,
      currency: config.symbol,
      usdValue,
      description: params.description || `Transfer to ${params.to}`,
      userId: params.userId,
    });
  }
  
  return result;
}
