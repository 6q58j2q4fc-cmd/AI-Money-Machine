import { http, createConfig } from 'wagmi';
import { mainnet, polygon, sepolia, polygonAmoy, arbitrum, optimism, base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet, metaMask } from 'wagmi/connectors';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// WalletConnect Project ID - Get one at https://cloud.walletconnect.com
const projectId = 'c4f79cc821944d9680842e34466bfb00';

// RainbowKit config with all major wallets
export const config = getDefaultConfig({
  appName: 'MoneyMachine NFT Marketplace',
  projectId,
  chains: [mainnet, polygon, arbitrum, optimism, base, sepolia, polygonAmoy],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
});

// Chain configuration for display
export const SUPPORTED_CHAINS = [
  { id: mainnet.id, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  { id: polygon.id, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
  { id: arbitrum.id, name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io' },
  { id: optimism.id, name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io' },
  { id: base.id, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org' },
  { id: sepolia.id, name: 'Sepolia (Testnet)', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
  { id: polygonAmoy.id, name: 'Polygon Amoy (Testnet)', symbol: 'MATIC', explorer: 'https://amoy.polygonscan.com' },
];

// Hot wallet address for receiving NFT purchase funds
export const HOT_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f5bC12';

export function getChainById(chainId: number) {
  return SUPPORTED_CHAINS.find(c => c.id === chainId);
}

export function getExplorerUrl(chainId: number, txHash: string) {
  const chain = getChainById(chainId);
  if (!chain) return '';
  return `${chain.explorer}/tx/${txHash}`;
}

export function getAddressExplorerUrl(chainId: number, address: string) {
  const chain = getChainById(chainId);
  if (!chain) return '';
  return `${chain.explorer}/address/${address}`;
}

// Wallet download links for users without wallets
export const WALLET_DOWNLOAD_LINKS = {
  metamask: 'https://metamask.io/download/',
  coinbase: 'https://www.coinbase.com/wallet/downloads',
  rainbow: 'https://rainbow.me/',
  trust: 'https://trustwallet.com/download',
  phantom: 'https://phantom.app/download',
};
