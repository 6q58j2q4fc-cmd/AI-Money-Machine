/**
 * ETH Withdrawal Service
 * Handles real ETH transfers using the hot wallet
 */

import { ethers } from "ethers";
import { getDb } from "../db";
import { walletSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getHotWalletAddress, checkAllBalances, sendTransactionWithLogging, NETWORKS as HOT_WALLET_NETWORKS } from "./hotWallet";
import type { NetworkId } from "./hotWallet";

// User's Trust Wallet address
export const TRUST_WALLET_ADDRESS = "0x75812e1c4246A880f6576db8292405247e6a8775";

// Supported networks with RPC endpoints
const NETWORKS: Record<string, {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  symbol: string;
}> = {
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
  status?: "pending" | "processing" | "completed" | "failed" | "simulated";
  isSimulated?: boolean;
  reason?: string;
}

// Track pending withdrawals
const pendingWithdrawals: Map<string, {
  id: string;
  userId: number;
  amount: number;
  currency: string;
  network: string;
  destinationAddress: string;
  status: "pending" | "processing" | "completed" | "failed" | "simulated";
  createdAt: Date;
  transactionHash?: string;
  isSimulated: boolean;
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
  if (!networkConfig) {
    return { gasPrice: "0", gasPriceGwei: "0", estimatedFee: "0" };
  }
  
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
    const estimatedFee = ethers.formatEther(gasPrice * BigInt(21000));
    
    return {
      gasPrice: gasPrice.toString(),
      gasPriceGwei: parseFloat(gasPriceGwei).toFixed(2),
      estimatedFee: parseFloat(estimatedFee).toFixed(6),
    };
  } catch (error) {
    console.error("Error getting gas price:", error);
    return { gasPrice: "0", gasPriceGwei: "0", estimatedFee: "0" };
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
  if (!networkConfig) {
    return { balance: "0", balanceWei: "0" };
  }
  
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
    return { balance: "0", balanceWei: "0" };
  }
}

/**
 * Check if hot wallet has sufficient funds for withdrawal
 */
export async function checkHotWalletFunds(network: NetworkKey, amount: number): Promise<{
  hasFunds: boolean;
  balance: number;
  required: number;
  shortfall: number;
}> {
  try {
    const allBalances = await checkAllBalances();
    const networkKey = network as NetworkId;
    const networkData = allBalances[networkKey];
    const balance = networkData ? parseFloat(networkData.balance) : 0;
    
    // Add gas buffer (0.001 ETH for gas)
    const required = amount + 0.001;
    const hasFunds = balance >= required;
    
    return {
      hasFunds,
      balance,
      required,
      shortfall: hasFunds ? 0 : required - balance,
    };
  } catch (error) {
    console.error("Error checking hot wallet funds:", error);
    return {
      hasFunds: false,
      balance: 0,
      required: amount,
      shortfall: amount,
    };
  }
}

/**
 * Process a REAL withdrawal using the hot wallet
 */
export async function processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
  const { userId, amount, currency, network } = request;
  
  // Validate amount
  if (amount <= 0) {
    return {
      success: false,
      message: "Invalid withdrawal amount. Must be greater than 0.",
      status: "failed",
      isSimulated: false,
    };
  }
  
  // Minimum withdrawal amounts
  const minimums: Record<string, number> = { ETH: 0.001, MATIC: 1 };
  const minAmount = minimums[currency] || 0.001;
  
  if (amount < minAmount) {
    return {
      success: false,
      message: `Minimum withdrawal is ${minAmount} ${currency}`,
      status: "failed",
      isSimulated: false,
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
      isSimulated: false,
    };
  }
  
  // Check network
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    return {
      success: false,
      message: `Unsupported network: ${network}`,
      status: "failed",
      isSimulated: false,
    };
  }
  
  // Check if hot wallet has sufficient funds
  const fundCheck = await checkHotWalletFunds(network, amount);
  
  if (!fundCheck.hasFunds) {
    // Return simulated result with clear indication
    const withdrawalId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    pendingWithdrawals.set(withdrawalId, {
      id: withdrawalId,
      userId,
      amount,
      currency,
      network,
      destinationAddress,
      status: "simulated",
      createdAt: new Date(),
      transactionHash: undefined,
      isSimulated: true,
    });
    
    return {
      success: false,
      message: `SIMULATED: Hot wallet needs funding. Balance: ${fundCheck.balance.toFixed(6)} ${currency}, Required: ${fundCheck.required.toFixed(6)} ${currency}. Fund the hot wallet with ${fundCheck.shortfall.toFixed(6)} ${currency} to enable real withdrawals.`,
      status: "simulated",
      isSimulated: true,
      reason: `Hot wallet balance insufficient. Need ${fundCheck.shortfall.toFixed(6)} more ${currency}.`,
      amount,
      currency,
      network: networkConfig.name,
      destinationAddress,
    };
  }
  
  // Hot wallet has funds - execute REAL transaction
  try {
    const hotWalletAddress = getHotWalletAddress();
    if (!hotWalletAddress) {
      return {
        success: false,
        message: "Hot wallet not initialized. Please set up the hot wallet first.",
        status: "failed",
        isSimulated: false,
      };
    }
    
    // Use sendTransactionWithLogging for real transaction with automatic logging
    const result = await sendTransactionWithLogging({
      to: destinationAddress,
      amount: amount.toString(),
      network: network as NetworkId,
      description: `Withdrawal of ${amount} ${currency} to ${destinationAddress}`,
      userId,
    });
    
    if (!result.success) {
      return {
        success: false,
        message: result.error || "Transaction failed",
        status: "failed",
        isSimulated: false,
      };
    }
    
    console.log(`[ETH Withdrawal] REAL transaction sent: ${result.transactionHash}`);
    
    // Store the successful withdrawal
    const withdrawalId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    pendingWithdrawals.set(withdrawalId, {
      id: withdrawalId,
      userId,
      amount,
      currency,
      network,
      destinationAddress,
      status: "completed",
      createdAt: new Date(),
      transactionHash: result.transactionHash,
      isSimulated: false,
    });
    
    return {
      success: true,
      message: `REAL withdrawal of ${amount} ${currency} completed successfully!`,
      transactionHash: result.transactionHash,
      explorerUrl: result.explorerUrl || `${networkConfig.explorer}/tx/${result.transactionHash}`,
      amount,
      currency,
      network: networkConfig.name,
      destinationAddress,
      estimatedArrival: "Confirmed",
      status: "completed",
      isSimulated: false,
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[ETH Withdrawal] Transaction failed:", error);
    
    return {
      success: false,
      message: `Transaction failed: ${errorMessage}`,
      status: "failed",
      isSimulated: false,
      reason: errorMessage,
    };
  }
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
      isSimulated: false,
    };
  }
  
  const networkConfig = NETWORKS[withdrawal.network];
  
  return {
    success: !withdrawal.isSimulated,
    message: withdrawal.isSimulated 
      ? `SIMULATED: This withdrawal requires hot wallet funding`
      : `Withdrawal ${withdrawal.status}`,
    transactionHash: withdrawal.transactionHash,
    explorerUrl: withdrawal.transactionHash && networkConfig
      ? `${networkConfig.explorer}/tx/${withdrawal.transactionHash}`
      : undefined,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    network: networkConfig?.name || withdrawal.network,
    destinationAddress: withdrawal.destinationAddress,
    status: withdrawal.status,
    isSimulated: withdrawal.isSimulated,
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
  isSimulated: boolean;
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
    isSimulated: boolean;
  }> = [];
  
  pendingWithdrawals.forEach((withdrawal) => {
    if (withdrawal.userId === userId) {
      const networkConfig = NETWORKS[withdrawal.network];
      withdrawals.push({
        id: withdrawal.id,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        network: networkConfig?.name || withdrawal.network,
        destinationAddress: withdrawal.destinationAddress,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        transactionHash: withdrawal.transactionHash,
        explorerUrl: withdrawal.transactionHash && networkConfig
          ? `${networkConfig.explorer}/tx/${withdrawal.transactionHash}`
          : undefined,
        isSimulated: withdrawal.isSimulated,
      });
    }
  });
  
  return withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get available networks
 */
export function getAvailableNetworks(): Array<{
  key: string;
  name: string;
  symbol: string;
  explorer: string;
}> {
  return Object.entries(NETWORKS).map(([key, config]) => ({
    key,
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

/**
 * Get hot wallet funding status for withdrawals
 */
export async function getWithdrawalReadiness(): Promise<{
  isReady: boolean;
  hotWalletAddress: string;
  balances: Array<{ network: string; balance: string; canWithdraw: boolean }>;
  message: string;
}> {
  try {
    const hotWalletAddress = getHotWalletAddress();
    const allBalances = await checkAllBalances();
    
    const balanceStatus = Object.entries(allBalances).map(([network, data]: [string, { balance: string }]) => ({
      network,
      balance: data.balance,
      canWithdraw: parseFloat(data.balance) > 0.001,
    }));
    
    const hasAnyFunds = balanceStatus.some((b) => b.canWithdraw);
    
    return {
      isReady: hasAnyFunds,
      hotWalletAddress: hotWalletAddress || "",
      balances: balanceStatus,
      message: hasAnyFunds 
        ? "Hot wallet is funded and ready for real withdrawals"
        : `Hot wallet needs funding. Send ETH or MATIC to ${hotWalletAddress} to enable real withdrawals.`,
    };
  } catch (error) {
    return {
      isReady: false,
      hotWalletAddress: "",
      balances: [],
      message: "Hot wallet not initialized",
    };
  }
}

export { NETWORKS };
