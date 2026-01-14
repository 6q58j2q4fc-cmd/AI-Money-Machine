import { http, createConfig } from 'wagmi';
import { mainnet, polygon, sepolia, polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - Get one at https://cloud.walletconnect.com
// For now, we'll use a placeholder that works for development
const projectId = 'c4f79cc821944d9680842e34466bfb';

export const config = createConfig({
  chains: [mainnet, polygon, sepolia, polygonAmoy],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
});

// Chain configuration for display
export const SUPPORTED_CHAINS = [
  { id: mainnet.id, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  { id: polygon.id, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
  { id: sepolia.id, name: 'Sepolia (Testnet)', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
  { id: polygonAmoy.id, name: 'Polygon Amoy (Testnet)', symbol: 'MATIC', explorer: 'https://amoy.polygonscan.com' },
];

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
