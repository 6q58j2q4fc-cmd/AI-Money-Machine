import React, { useState } from 'react';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Check, Download } from 'lucide-react';
import { SUPPORTED_CHAINS, getAddressExplorerUrl, WALLET_DOWNLOAD_LINKS } from '../lib/wagmi';
import { toast } from 'sonner';

// Main Connect Wallet component using RainbowKit
export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold rounded-xl shadow-lg shadow-yellow-500/20"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  <Button
                    onClick={openAccountModal}
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono">{account.displayName}</span>
                    {account.displayBalance && (
                      <span className="text-muted-foreground">
                        {account.displayBalance}
                      </span>
                    )}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Simple wallet button for marketplace pages
export function MarketplaceWalletButton() {
  return <ConnectButton showBalance={true} chainStatus="icon" accountStatus="address" />;
}

// Hook to use wallet state in other components
export function useWallet() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  
  return {
    address,
    isConnected,
    connector,
    chainId,
    balance: balance ? Number(balance.value) / Math.pow(10, balance.decimals) : 0,
    balanceFormatted: balance ? (Number(balance.value) / Math.pow(10, balance.decimals)).toFixed(4) : '0',
    symbol: balance?.symbol || 'ETH',
  };
}

// Wallet download options component
export function WalletDownloadOptions() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <a
        href={WALLET_DOWNLOAD_LINKS.metamask}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">MetaMask</p>
          <p className="text-xs text-zinc-400">Browser & Mobile</p>
        </div>
      </a>
      
      <a
        href={WALLET_DOWNLOAD_LINKS.coinbase}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">Coinbase</p>
          <p className="text-xs text-zinc-400">Easy onboarding</p>
        </div>
      </a>
      
      <a
        href={WALLET_DOWNLOAD_LINKS.rainbow}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">Rainbow</p>
          <p className="text-xs text-zinc-400">Mobile wallet</p>
        </div>
      </a>
      
      <a
        href={WALLET_DOWNLOAD_LINKS.trust}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">Trust Wallet</p>
          <p className="text-xs text-zinc-400">Multi-chain</p>
        </div>
      </a>
    </div>
  );
}
