import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminOnlyProps {
  children: ReactNode;
}

export default function AdminOnly({ children }: AdminOnlyProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user is the owner (admin)
  const isOwner = user?.role === "admin" || user?.openId === import.meta.env.VITE_OWNER_OPEN_ID;
  
  useEffect(() => {
    // If not loading and not authenticated, redirect to marketplace
    if (!loading && !user) {
      // Don't redirect immediately, show login prompt
    }
  }, [loading, user]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking authorization...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-zinc-400 mb-6">
            This area is restricted to administrators only. Please log in with your admin account to continue.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = `${import.meta.env.VITE_OAUTH_PORTAL_URL}?app_id=${import.meta.env.VITE_APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/oauth/callback')}`}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              Admin Login
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/market")}
              className="w-full border-zinc-700"
            >
              Go to Public Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">
            You don't have permission to access this area. Only the site owner can access admin features.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/market")}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              Go to Marketplace
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/profile")}
              className="w-full border-zinc-700"
            >
              View Your Profile
            </Button>
          </div>
          <p className="text-xs text-zinc-600 mt-6">
            Logged in as: {user.name || user.openId}
          </p>
        </div>
      </div>
    );
  }
  
  // User is owner, render children
  return <>{children}</>;
}
