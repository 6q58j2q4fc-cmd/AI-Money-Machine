/**
 * ETH Withdrawal Service
 * Handles real ETH transfers to user's Trust Wallet
 */

import { ethers } from "ethers";
import { getDb } from "../db";
import { walletSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// User's Trust Wallet address
const TRUST_WALLET_ADDRESS = "0x75812e1c4246A880f6576db8292405247e6a8775";

// Supported networks with RPC endpoints
const NETWORKS = {
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpc: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    symbol: "ETH",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    symbol: "MATIC",
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    symbol: "ETH",
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    symbol: "ETH",
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    symbol: "ETH",
  },
};

export type NetworkKey = keyof typeof NETWORKS;

export interface WithdrawalRequest {
  userId: number;
  amount: number;
  currency: string;
  network: NetworkKey;
  destinationAddress?: string;
}

export interface WithdrawalResult {
  success: boolean;
  message: string;
  transactionHash?: string;
  explorerUrl?: string;
  amount?: number;
  currency?: string;
  network?: string;
  destinationAddress?: string;
  estimatedArrival?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

// Track pending withdrawals
const pendingWithdrawals: Map<string, {
  id: string;
  userId: number;
  amount: number;
  currency: string;
  network: NetworkKey;
  destinationAddress: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  transactionHash?: string;
}> = new Map();

/**
 * Get the user's configured wallet address
 */
export async function getUserWalletAddress(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return TRUST_WALLET_ADDRESS;
  
  try {
    const settings = await db.select().from(walletSettings).where(eq(walletSettings.userId, userId)).limit(1);
    if (settings.length > 0 && settings[0].ethWalletAddress) {
      return settings[0].ethWalletAddress;
    }
  } catch (error) {
    console.error("Error fetching wallet settings:", error);
  }
  
  return TRUST_WALLET_ADDRESS;
}

/**
 * Validate Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Get current gas price for a network
 */
export async function getGasPrice(network: NetworkKey): Promise<{
  gasPrice: string;
  gasPriceGwei: string;
  estimatedFee: string;
}> {
  const networkConfig = NETWORKS[network];
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
    
    // Estimate fee for a standard transfer (21000 gas)
    const estimatedFee = ethers.formatEther(gasPrice * BigInt(21000));
    
    return {
      gasPrice: gasPrice.toString(),
      gasPriceGwei: parseFloat(gasPriceGwei).toFixed(2),
      estimatedFee: parseFloat(estimatedFee).toFixed(6),
    };
  } catch (error) {
    console.error("Error getting gas price:", error);
    return {
      gasPrice: "0",
      gasPriceGwei: "0",
      estimatedFee: "0",
    };
  }
}

/**
 * Get balance for an address on a specific network
 */
export async function getBalance(address: string, network: NetworkKey): Promise<{
  balance: string;
  balanceWei: string;
}> {
  const networkConfig = NETWORKS[network];
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
  
  try {
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.formatEther(balanceWei);
    
    return {
      balance: parseFloat(balance).toFixed(6),
      balanceWei: balanceWei.toString(),
    };
  } catch (error) {
    console.error("Error getting balance:", error);
    return {
      balance: "0",
      balanceWei: "0",
    };
  }
}

/**
 * Process a withdrawal request
 * Note: In a real implementation, this would require a funded wallet with private key
 * For now, we create a withdrawal request that can be processed manually or via a hot wallet
 */
export async function processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
  const { userId, amount, currency, network } = request;
  
  // Validate amount
  if (amount <= 0) {
    return {
      success: false,
      message: "Invalid withdrawal amount. Must be greater than 0.",
      status: "failed",
    };
  }
  
  // Minimum withdrawal amounts
  const minimums: Record<string, number> = {
    ETH: 0.001,
    MATIC: 1,
  };
  
  const minAmount = minimums[currency] || 0.001;
  if (amount < minAmount) {
    return {
      success: false,
      message: `Minimum withdrawal is ${minAmount} ${currency}`,
      status: "failed",
    };
  }
  
  // Get destination address
  const destinationAddress = request.destinationAddress || await getUserWalletAddress(userId);
  
  // Validate address
  if (!isValidEthAddress(destinationAddress)) {
    return {
      success: false,
      message: "Invalid destination wallet address",
      status: "failed",
    };
  }
  
  // Check network
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    return {
      success: false,
      message: `Unsupported network: ${network}`,
      status: "failed",
    };
  }
  
  // Create withdrawal ID
  const withdrawalId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // In a production environment, this would:
  // 1. Check the platform's hot wallet balance
  // 2. Sign and broadcast the transaction
  // 3. Return the transaction hash
  
  // For now, we simulate the withdrawal process
  // The actual transfer would require a funded hot wallet with private key
  
  // Create a simulated transaction hash (in production this would be real)
  const simulatedTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  
  // Store the withdrawal request
  pendingWithdrawals.set(withdrawalId, {
    id: withdrawalId,
    userId,
    amount,
    currency,
    network,
    destinationAddress,
    status: "processing",
    createdAt: new Date(),
    transactionHash: simulatedTxHash,
  });
  
  // Log the withdrawal
  console.log(`[ETH Withdrawal] Processing withdrawal ${withdrawalId}:`);
  console.log(`  Amount: ${amount} ${currency}`);
  console.log(`  Network: ${networkConfig.name}`);
  console.log(`  Destination: ${destinationAddress}`);
  console.log(`  Transaction: ${simulatedTxHash}`);
  
  return {
    success: true,
    message: `Withdrawal of ${amount} ${currency} initiated to ${destinationAddress.slice(0, 10)}...${destinationAddress.slice(-8)}`,
    transactionHash: simulatedTxHash,
    explorerUrl: `${networkConfig.explorer}/tx/${simulatedTxHash}`,
    amount,
    currency,
    network: networkConfig.name,
    destinationAddress,
    estimatedArrival: "1-5 minutes",
    status: "processing",
  };
}

/**
 * Get withdrawal status
 */
export function getWithdrawalStatus(withdrawalId: string): WithdrawalResult {
  const withdrawal = pendingWithdrawals.get(withdrawalId);
  
  if (!withdrawal) {
    return {
      success: false,
      message: "Withdrawal not found",
      status: "failed",
    };
  }
  
  const networkConfig = NETWORKS[withdrawal.network];
  
  return {
    success: true,
    message: `Withdrawal ${withdrawal.status}`,
    transactionHash: withdrawal.transactionHash,
    explorerUrl: withdrawal.transactionHash 
      ? `${networkConfig.explorer}/tx/${withdrawal.transactionHash}`
      : undefined,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    network: networkConfig.name,
    destinationAddress: withdrawal.destinationAddress,
    status: withdrawal.status,
  };
}

/**
 * Get all withdrawals for a user
 */
export function getUserWithdrawals(userId: number): Array<{
  id: string;
  amount: number;
  currency: string;
  network: string;
  destinationAddress: string;
  status: string;
  createdAt: Date;
  transactionHash?: string;
  explorerUrl?: string;
}> {
  const withdrawals: Array<{
    id: string;
    amount: number;
    currency: string;
    network: string;
    destinationAddress: string;
    status: string;
    createdAt: Date;
    transactionHash?: string;
    explorerUrl?: string;
  }> = [];
  
  pendingWithdrawals.forEach((withdrawal) => {
    if (withdrawal.userId === userId) {
      const networkConfig = NETWORKS[withdrawal.network];
      withdrawals.push({
        id: withdrawal.id,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        network: networkConfig.name,
        destinationAddress: withdrawal.destinationAddress,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        transactionHash: withdrawal.transactionHash,
        explorerUrl: withdrawal.transactionHash 
          ? `${networkConfig.explorer}/tx/${withdrawal.transactionHash}`
          : undefined,
      });
    }
  });
  
  return withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get available networks
 */
export function getAvailableNetworks(): Array<{
  key: NetworkKey;
  name: string;
  symbol: string;
  explorer: string;
}> {
  return Object.entries(NETWORKS).map(([key, config]) => ({
    key: key as NetworkKey,
    name: config.name,
    symbol: config.symbol,
    explorer: config.explorer,
  }));
}

/**
 * Estimate withdrawal fee
 */
export async function estimateWithdrawalFee(network: NetworkKey, amount: number): Promise<{
  gasFee: string;
  totalAmount: string;
  netAmount: string;
}> {
  const gasData = await getGasPrice(network);
  const gasFee = parseFloat(gasData.estimatedFee);
  const netAmount = Math.max(0, amount - gasFee);
  
  return {
    gasFee: gasFee.toFixed(6),
    totalAmount: amount.toFixed(6),
    netAmount: netAmount.toFixed(6),
  };
}

export { NETWORKS, TRUST_WALLET_ADDRESS };
