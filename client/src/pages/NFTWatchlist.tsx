import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  Heart, Eye, TrendingUp, TrendingDown, Bell, BellOff, 
  Trash2, ExternalLink, ArrowUpRight, ArrowDownRight,
  RefreshCw, ShoppingCart, Clock
} from "lucide-react";

export default function NFTWatchlist() {
  const { data: favorites, isLoading, refetch } = trpc.marketplace.getFavorites.useQuery();
  const removeFromFavorites = trpc.marketplace.removeFromFavorites.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Removed from watchlist');
    },
  });

  const getPriceChangeColor = (change: string) => {
    const value = parseFloat(change);
    if (value > 0) return "text-green-400";
    if (value < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getPriceChangeIcon = (change: string) => {
    const value = parseFloat(change);
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
              <Heart className="w-8 h-8" />
              NFT Watchlist
            </h1>
            <p className="text-gray-400 mt-1">
              Track your favorite NFTs and get notified of price changes
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="border-gray-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/marketplace">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Watching</p>
              <p className="text-2xl font-bold text-white">{favorites?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-yellow-400">
                {favorites?.reduce((sum, f) => sum + parseFloat(f.nft?.estimatedValue || '0'), 0).toFixed(4)} ETH
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Price Increases</p>
              <p className="text-2xl font-bold text-green-400">
                {favorites?.filter(f => parseFloat(f.priceChange || '0') > 0).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Price Decreases</p>
              <p className="text-2xl font-bold text-red-400">
                {favorites?.filter(f => parseFloat(f.priceChange || '0') < 0).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Watchlist */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-yellow-400" />
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <Card 
                key={favorite.favoriteId} 
                className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-yellow-500/50 transition-all"
              >
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="relative aspect-square">
                    <img 
                      src={favorite.nft?.imageUrl || '/placeholder-nft.png'} 
                      alt={favorite.nft?.name || 'NFT'}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 left-3 bg-black/70">
                      {favorite.nft?.category}
                    </Badge>
                    <Badge 
                      className={`absolute top-3 right-3 ${
                        parseFloat(favorite.priceChange || '0') > 0 
                          ? 'bg-green-500/20 text-green-400' 
                          : parseFloat(favorite.priceChange || '0') < 0 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {getPriceChangeIcon(favorite.priceChange || '0')}
                      {parseFloat(favorite.priceChange || '0') > 0 ? '+' : ''}
                      {favorite.priceChange}%
                    </Badge>
                  </div>
                  
                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-white truncate">{favorite.nft?.name}</h3>
                      <p className="text-sm text-gray-400">{favorite.nft?.chain}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Current Price</p>
                        <p className="text-lg font-bold text-yellow-400">
                          {parseFloat(favorite.nft?.estimatedValue || '0').toFixed(4)} ETH
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Saved At</p>
                        <p className="text-sm text-gray-300">
                          {parseFloat(favorite.priceAtSave || '0').toFixed(4)} ETH
                        </p>
                      </div>
                    </div>
                    
                    {/* Notification settings */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <div className="flex items-center gap-2">
                        {favorite.notifyOnPriceChange ? (
                          <Bell className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <BellOff className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-xs text-gray-400">
                          {favorite.notifyOnPriceChange ? 'Alerts on' : 'Alerts off'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/marketplace?nft=${favorite.nftAssetId}`}>
                          <Button size="sm" variant="outline" className="border-gray-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => removeFromFavorites.mutate({ nftAssetId: favorite.nftAssetId })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No NFTs in your watchlist</h3>
              <p className="text-gray-400 mb-4">
                Start adding NFTs to track their prices and get notified of changes
              </p>
              <Link href="/marketplace">
                <Button className="bg-yellow-500 hover:bg-yellow-400 text-black">
                  Browse Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
