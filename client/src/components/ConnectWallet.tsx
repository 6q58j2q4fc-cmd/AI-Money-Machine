import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Check, Loader2 } from 'lucide-react';
import { SUPPORTED_CHAINS, getAddressExplorerUrl } from '../lib/wagmi';
import { toast } from 'sonner';

export function ConnectWallet() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentChain = SUPPORTED_CHAINS.find(c => c.id === chainId);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!', { description: address });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: typeof balance) => {
    if (!bal) return '0.0000';
    // Convert bigint value to formatted string
    const value = Number(bal.value) / Math.pow(10, bal.decimals);
    return value.toFixed(4);
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono">{formatAddress(address)}</span>
            <span className="text-muted-foreground">
              {formatBalance(balance)} {currentChain?.symbol || 'ETH'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Connected Wallet
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground mb-1">Address</p>
            <p className="font-mono text-sm">{formatAddress(address)}</p>
          </div>
          
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className="text-sm font-semibold">
              {formatBalance(balance)} {currentChain?.symbol || 'ETH'}
            </p>
          </div>
          
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground mb-1">Network</p>
            <p className="text-sm">{currentChain?.name || 'Unknown'}</p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={copyAddress} className="gap-2 cursor-pointer">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            Copy Address
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => window.open(getAddressExplorerUrl(chainId, address), '_blank')}
            className="gap-2 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Network</DropdownMenuLabel>
          {SUPPORTED_CHAINS.map((chain) => (
            <DropdownMenuItem 
              key={chain.id}
              onClick={() => switchChain?.({ chainId: chain.id })}
              className="gap-2 cursor-pointer"
            >
              {chain.id === chainId && <Check className="h-4 w-4 text-green-500" />}
              {chain.id !== chainId && <div className="w-4" />}
              {chain.name}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your wallet to buy, sell, and trade NFTs on the marketplace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start gap-3 h-14 text-left"
              onClick={() => {
                connect({ connector });
                setIsOpen(false);
              }}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <p className="font-medium">{connector.name}</p>
                <p className="text-xs text-muted-foreground">
                  {connector.name === 'MetaMask' && 'Popular browser extension'}
                  {connector.name === 'WalletConnect' && 'Scan with mobile wallet'}
                  {connector.name === 'Injected' && 'Browser wallet'}
                </p>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="text-center text-xs text-muted-foreground">
          <p>By connecting, you agree to our Terms of Service</p>
          <p className="mt-1">
            New to crypto?{' '}
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-500 hover:underline"
            >
              Get MetaMask
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
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
