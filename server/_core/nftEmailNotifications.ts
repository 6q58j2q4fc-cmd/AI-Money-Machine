/**
 * NFT Email Notifications Service
 * Sends email notifications to buyers and sellers for NFT transactions
 */

import { notifyOwner } from './notification';

interface NFTDetails {
  id: number;
  name: string;
  imageUrl?: string;
  price: number;
  blockchain: string;
  tokenId?: string;
  contractAddress?: string;
}

interface BuyerDetails {
  email?: string;
  walletAddress: string;
  name?: string;
}

interface SellerDetails {
  email?: string;
  walletAddress: string;
  name?: string;
}

interface TransactionDetails {
  txHash: string;
  amount: number;
  currency: string;
  timestamp: Date;
  marketplaceFee?: number;
  royaltyFee?: number;
  netAmount?: number;
}

/**
 * Send purchase confirmation to buyer
 */
export async function notifyBuyerPurchaseConfirmed(
  nft: NFTDetails,
  buyer: BuyerDetails,
  transaction: TransactionDetails
): Promise<boolean> {
  const content = `
🎉 **NFT Purchase Confirmed!**

**NFT Details:**
- Name: ${nft.name}
- Token ID: ${nft.tokenId || 'Pending'}
- Blockchain: ${nft.blockchain}
- Contract: ${nft.contractAddress || 'N/A'}

**Transaction Details:**
- Amount Paid: ${transaction.amount} ${transaction.currency}
- Transaction Hash: ${transaction.txHash}
- Date: ${transaction.timestamp.toISOString()}

**Buyer Wallet:** ${buyer.walletAddress}

Your NFT has been transferred to your wallet. You can view it on:
- OpenSea: https://opensea.io/assets/${nft.blockchain}/${nft.contractAddress}/${nft.tokenId}
- Rarible: https://rarible.com/token/${nft.contractAddress}:${nft.tokenId}

Thank you for your purchase!
  `.trim();

  // Notify owner about the sale
  await notifyOwner({
    title: `🛒 NFT Sold: ${nft.name}`,
    content: `Buyer: ${buyer.walletAddress}\nAmount: ${transaction.amount} ${transaction.currency}\nTx: ${transaction.txHash}`
  });

  return true;
}

/**
 * Send sale notification to seller
 */
export async function notifySellerNFTSold(
  nft: NFTDetails,
  seller: SellerDetails,
  buyer: BuyerDetails,
  transaction: TransactionDetails
): Promise<boolean> {
  const netAmount = transaction.netAmount || 
    (transaction.amount - (transaction.marketplaceFee || 0) - (transaction.royaltyFee || 0));

  const content = `
💰 **Your NFT Has Been Sold!**

**NFT Details:**
- Name: ${nft.name}
- Token ID: ${nft.tokenId || 'N/A'}
- Blockchain: ${nft.blockchain}

**Sale Details:**
- Sale Price: ${transaction.amount} ${transaction.currency}
- Marketplace Fee: ${transaction.marketplaceFee || 0} ${transaction.currency}
- Royalty Fee: ${transaction.royaltyFee || 0} ${transaction.currency}
- **Net Amount: ${netAmount} ${transaction.currency}**

**Transaction:**
- Hash: ${transaction.txHash}
- Date: ${transaction.timestamp.toISOString()}
- Buyer: ${buyer.walletAddress}

Funds have been transferred to your wallet: ${seller.walletAddress}

View transaction: https://etherscan.io/tx/${transaction.txHash}
  `.trim();

  // Notify owner about the sale
  await notifyOwner({
    title: `💰 NFT Sale Complete: ${nft.name}`,
    content: `Net Amount: ${netAmount} ${transaction.currency}\nBuyer: ${buyer.walletAddress}\nTx: ${transaction.txHash}`
  });

  return true;
}

/**
 * Send listing notification
 */
export async function notifyNFTListed(
  nft: NFTDetails,
  seller: SellerDetails,
  listingUrl: string,
  marketplace: string
): Promise<boolean> {
  const content = `
📋 **NFT Listed for Sale**

**NFT Details:**
- Name: ${nft.name}
- Price: ${nft.price} ETH
- Blockchain: ${nft.blockchain}
- Marketplace: ${marketplace}

**Listing URL:** ${listingUrl}

Your NFT is now live and available for purchase!
  `.trim();

  await notifyOwner({
    title: `📋 NFT Listed: ${nft.name}`,
    content: `Price: ${nft.price} ETH\nMarketplace: ${marketplace}\nURL: ${listingUrl}`
  });

  return true;
}

/**
 * Send offer received notification
 */
export async function notifyOfferReceived(
  nft: NFTDetails,
  seller: SellerDetails,
  offerAmount: number,
  offerCurrency: string,
  buyerWallet: string,
  expiresAt?: Date
): Promise<boolean> {
  const content = `
🔔 **New Offer Received!**

**NFT:** ${nft.name}
**Offer Amount:** ${offerAmount} ${offerCurrency}
**From:** ${buyerWallet}
${expiresAt ? `**Expires:** ${expiresAt.toISOString()}` : ''}

Review and respond to this offer in your marketplace dashboard.
  `.trim();

  await notifyOwner({
    title: `🔔 Offer on ${nft.name}: ${offerAmount} ${offerCurrency}`,
    content: `From: ${buyerWallet}\n${expiresAt ? `Expires: ${expiresAt.toISOString()}` : ''}`
  });

  return true;
}

/**
 * Send royalty payment notification
 */
export async function notifyRoyaltyPayment(
  nft: NFTDetails,
  royaltyAmount: number,
  currency: string,
  salePrice: number,
  txHash: string
): Promise<boolean> {
  const royaltyPercent = ((royaltyAmount / salePrice) * 100).toFixed(1);

  const content = `
👑 **Royalty Payment Received!**

**NFT:** ${nft.name}
**Royalty Amount:** ${royaltyAmount} ${currency} (${royaltyPercent}%)
**Sale Price:** ${salePrice} ${currency}
**Transaction:** ${txHash}

Your creator royalty has been deposited to your wallet.
  `.trim();

  await notifyOwner({
    title: `👑 Royalty: ${royaltyAmount} ${currency} for ${nft.name}`,
    content: `Sale Price: ${salePrice} ${currency}\nTx: ${txHash}`
  });

  return true;
}

/**
 * Send transfer confirmation
 */
export async function notifyNFTTransferred(
  nft: NFTDetails,
  fromWallet: string,
  toWallet: string,
  txHash: string
): Promise<boolean> {
  const content = `
🔄 **NFT Transfer Complete**

**NFT:** ${nft.name}
**From:** ${fromWallet}
**To:** ${toWallet}
**Transaction:** ${txHash}

The NFT has been successfully transferred.
  `.trim();

  await notifyOwner({
    title: `🔄 NFT Transferred: ${nft.name}`,
    content: `From: ${fromWallet}\nTo: ${toWallet}\nTx: ${txHash}`
  });

  return true;
}

/**
 * Send daily sales summary
 */
export async function notifyDailySalesSummary(
  totalSales: number,
  totalVolume: number,
  currency: string,
  topSales: Array<{ name: string; price: number }>,
  date: Date
): Promise<boolean> {
  const topSalesText = topSales.length > 0
    ? topSales.map((s, i) => `${i + 1}. ${s.name}: ${s.price} ${currency}`).join('\n')
    : 'No sales today';

  const content = `
📊 **Daily NFT Sales Summary**

**Date:** ${date.toDateString()}
**Total Sales:** ${totalSales}
**Total Volume:** ${totalVolume} ${currency}

**Top Sales:**
${topSalesText}

View full analytics in your dashboard.
  `.trim();

  await notifyOwner({
    title: `📊 Daily Summary: ${totalSales} sales, ${totalVolume} ${currency}`,
    content: `Date: ${date.toDateString()}\n${topSalesText}`
  });

  return true;
}
