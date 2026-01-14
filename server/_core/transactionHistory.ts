/**
 * Real Blockchain Transaction History Service
 * Fetches actual transaction data from Etherscan and other block explorers
 */

import { NETWORKS, NetworkId } from './hotWallet';

// Free API endpoints (no key required for basic queries)
const EXPLORER_APIS = {
  ethereum: 'https://api.etherscan.io/api',
  polygon: 'https://api.polygonscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  base: 'https://api.basescan.org/api',
} as const;

export interface BlockchainTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  confirmations: string;
  methodId: string;
  functionName: string;
  // Computed fields
  network: NetworkId;
  valueFormatted: string;
  explorerUrl: string;
  type: 'incoming' | 'outgoing' | 'self';
  status: 'success' | 'failed' | 'pending';
  dateFormatted: string;
}

/**
 * Fetch real transaction history from blockchain explorer
 */
export async function fetchRealTransactionHistory(
  address: string,
  network: NetworkId = 'ethereum',
  options?: {
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<{
  success: boolean;
  transactions: BlockchainTransaction[];
  error?: string;
}> {
  const apiUrl = EXPLORER_APIS[network];
  const config = NETWORKS[network];
  
  const page = options?.page || 1;
  const offset = options?.offset || 50;
  const sort = options?.sort || 'desc';
  
  try {
    // Fetch normal transactions (no API key needed for basic queries)
    const url = `${apiUrl}?module=account&action=txlist&address=${address}&page=${page}&offset=${offset}&sort=${sort}`;
    
    console.log(`[TransactionHistory] Fetching from ${network}: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1' || !Array.isArray(data.result)) {
      // No transactions or error
      if (data.message === 'No transactions found') {
        return { success: true, transactions: [] };
      }
      return { 
        success: false, 
        transactions: [],
        error: data.message || 'Failed to fetch transactions'
      };
    }
    
    // Transform and enrich transaction data
    const transactions: BlockchainTransaction[] = data.result.map((tx: any) => {
      const valueWei = BigInt(tx.value || '0');
      const valueEth = Number(valueWei) / 1e18;
      const timestamp = parseInt(tx.timeStamp) * 1000;
      
      // Determine transaction type
      let type: 'incoming' | 'outgoing' | 'self' = 'outgoing';
      if (tx.from.toLowerCase() === address.toLowerCase() && tx.to.toLowerCase() === address.toLowerCase()) {
        type = 'self';
      } else if (tx.to.toLowerCase() === address.toLowerCase()) {
        type = 'incoming';
      }
      
      // Determine status
      let status: 'success' | 'failed' | 'pending' = 'success';
      if (tx.isError === '1' || tx.txreceipt_status === '0') {
        status = 'failed';
      }
      
      return {
        ...tx,
        network,
        valueFormatted: `${valueEth.toFixed(6)} ${config.symbol}`,
        explorerUrl: `${config.explorer}/tx/${tx.hash}`,
        type,
        status,
        dateFormatted: new Date(timestamp).toLocaleString(),
      };
    });
    
    console.log(`[TransactionHistory] Found ${transactions.length} transactions on ${network}`);
    
    return { success: true, transactions };
  } catch (error: any) {
    console.error(`[TransactionHistory] Error fetching from ${network}:`, error);
    return {
      success: false,
      transactions: [],
      error: error.message || 'Network error'
    };
  }
}

/**
 * Fetch transaction history from all networks
 */
export async function fetchAllNetworkTransactions(
  address: string,
  options?: {
    limit?: number;
  }
): Promise<{
  success: boolean;
  transactions: BlockchainTransaction[];
  byNetwork: Record<NetworkId, BlockchainTransaction[]>;
  totalCount: number;
  errors: string[];
}> {
  const limit = options?.limit || 20;
  const networks: NetworkId[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
  
  const allTransactions: BlockchainTransaction[] = [];
  const byNetwork: Record<NetworkId, BlockchainTransaction[]> = {
    ethereum: [],
    polygon: [],
    arbitrum: [],
    optimism: [],
    base: [],
  };
  const errors: string[] = [];
  
  // Fetch from all networks in parallel
  const results = await Promise.allSettled(
    networks.map(network => 
      fetchRealTransactionHistory(address, network, { offset: limit })
    )
  );
  
  results.forEach((result, index) => {
    const network = networks[index];
    
    if (result.status === 'fulfilled' && result.value.success) {
      byNetwork[network] = result.value.transactions;
      allTransactions.push(...result.value.transactions);
    } else if (result.status === 'fulfilled' && result.value.error) {
      errors.push(`${network}: ${result.value.error}`);
    } else if (result.status === 'rejected') {
      errors.push(`${network}: ${result.reason}`);
    }
  });
  
  // Sort all transactions by timestamp (newest first)
  allTransactions.sort((a, b) => {
    return parseInt(b.timeStamp) - parseInt(a.timeStamp);
  });
  
  return {
    success: errors.length < networks.length,
    transactions: allTransactions,
    byNetwork,
    totalCount: allTransactions.length,
    errors,
  };
}

/**
 * Get transaction details by hash
 */
export async function getTransactionDetails(
  txHash: string,
  network: NetworkId = 'ethereum'
): Promise<{
  success: boolean;
  transaction?: BlockchainTransaction;
  receipt?: any;
  error?: string;
}> {
  const apiUrl = EXPLORER_APIS[network];
  const config = NETWORKS[network];
  
  try {
    // Get transaction receipt
    const receiptUrl = `${apiUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`;
    const receiptResponse = await fetch(receiptUrl);
    const receiptData = await receiptResponse.json();
    
    if (!receiptData.result) {
      return {
        success: false,
        error: 'Transaction not found or pending'
      };
    }
    
    // Get transaction details
    const txUrl = `${apiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
    const txResponse = await fetch(txUrl);
    const txData = await txResponse.json();
    
    if (!txData.result) {
      return {
        success: false,
        error: 'Transaction details not found'
      };
    }
    
    const tx = txData.result;
    const receipt = receiptData.result;
    
    const valueWei = BigInt(tx.value || '0');
    const valueEth = Number(valueWei) / 1e18;
    
    const transaction: BlockchainTransaction = {
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber, 16).toString(),
      timeStamp: '', // Would need block timestamp
      from: tx.from,
      to: tx.to || '',
      value: tx.value,
      gas: parseInt(tx.gas, 16).toString(),
      gasPrice: parseInt(tx.gasPrice, 16).toString(),
      gasUsed: parseInt(receipt.gasUsed, 16).toString(),
      isError: receipt.status === '0x1' ? '0' : '1',
      txreceipt_status: receipt.status === '0x1' ? '1' : '0',
      input: tx.input,
      contractAddress: receipt.contractAddress || '',
      confirmations: '',
      methodId: tx.input?.slice(0, 10) || '',
      functionName: '',
      network,
      valueFormatted: `${valueEth.toFixed(6)} ${config.symbol}`,
      explorerUrl: `${config.explorer}/tx/${txHash}`,
      type: 'outgoing',
      status: receipt.status === '0x1' ? 'success' : 'failed',
      dateFormatted: 'Unknown',
    };
    
    return {
      success: true,
      transaction,
      receipt,
    };
  } catch (error: any) {
    console.error(`[TransactionHistory] Error fetching tx ${txHash}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to fetch transaction'
    };
  }
}

/**
 * Verify if a transaction hash is valid and confirmed
 */
export async function verifyTransaction(
  txHash: string,
  network: NetworkId = 'ethereum'
): Promise<{
  valid: boolean;
  confirmed: boolean;
  status: 'success' | 'failed' | 'pending' | 'not_found';
  blockNumber?: string;
  confirmations?: number;
  explorerUrl: string;
}> {
  const config = NETWORKS[network];
  const explorerUrl = `${config.explorer}/tx/${txHash}`;
  
  try {
    const result = await getTransactionDetails(txHash, network);
    
    if (!result.success || !result.transaction) {
      return {
        valid: false,
        confirmed: false,
        status: 'not_found',
        explorerUrl,
      };
    }
    
    return {
      valid: true,
      confirmed: result.transaction.status === 'success',
      status: result.transaction.status,
      blockNumber: result.transaction.blockNumber,
      explorerUrl,
    };
  } catch (error) {
    return {
      valid: false,
      confirmed: false,
      status: 'not_found',
      explorerUrl,
    };
  }
}
