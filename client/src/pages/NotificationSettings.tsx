/**
 * Notification Settings Page
 * Allows users to manage their notification preferences
 */

import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, Check, X, Loader2, TestTube } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

interface NotificationPreference {
  inAppEnabled: boolean;
  inAppNftSold: boolean;
  inAppNftPurchased: boolean;
  inAppPriceAlert: boolean;
  inAppNewListing: boolean;
  inAppArticle: boolean;
  inAppPayment: boolean;
  inAppSystem: boolean;
  inAppPromotion: boolean;
  emailEnabled: boolean;
  emailNftSold: boolean;
  emailNftPurchased: boolean;
  emailPriceAlert: boolean;
  emailNewListing: boolean;
  emailArticle: boolean;
  emailPayment: boolean;
  emailWeeklySummary: boolean;
  pushEnabled: boolean;
  pushNftSold: boolean;
  pushNftPurchased: boolean;
  pushPriceAlert: boolean;
  pushPayment: boolean;
}

export default function NotificationSettings() {
  // Using sonner toast directly
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  
  const { data: prefsData, isLoading, refetch } = trpc.notifications.getPreferences.useQuery();
  
  const updatePrefsMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Settings saved", {
        description: "Your notification preferences have been updated.",
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });
  
  const sendTestMutation = trpc.notifications.sendTestNotification.useMutation({
    onSuccess: () => {
      toast.success("Test notification sent", {
        description: "Check your notification bell for the test message.",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });
  
  useEffect(() => {
    if (prefsData) {
      setPreferences(prefsData as NotificationPreference);
    }
  }, [prefsData]);
  
  const updatePreference = (key: keyof NotificationPreference, value: boolean) => {
    if (!preferences) return;
    
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    // Auto-save on change
    updatePrefsMutation.mutate({ [key]: value });
  };
  
  const toggleMasterSwitch = (type: "inApp" | "email" | "push", enabled: boolean) => {
    if (!preferences) return;
    
    const updates: Partial<NotificationPreference> = {};
    
    if (type === "inApp") {
      updates.inAppEnabled = enabled;
    } else if (type === "email") {
      updates.emailEnabled = enabled;
    } else if (type === "push") {
      updates.pushEnabled = enabled;
    }
    
    setPreferences({ ...preferences, ...updates });
    updatePrefsMutation.mutate(updates);
  };
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">
              Manage how you receive notifications
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => sendTestMutation.mutate()}
            disabled={sendTestMutation.isPending}
          >
            {sendTestMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Send Test Notification
          </Button>
        </div>
        
        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">In-App Notifications</CardTitle>
                  <CardDescription>
                    Notifications shown in the notification bell
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences?.inAppEnabled ?? true}
                onCheckedChange={(checked) => toggleMasterSwitch("inApp", checked)}
              />
            </div>
          </CardHeader>
          {preferences?.inAppEnabled && (
            <CardContent className="space-y-4">
              <Separator />
              <div className="grid gap-4">
                <NotificationToggle
                  label="NFT Sold"
                  description="When one of your NFTs is purchased"
                  checked={preferences?.inAppNftSold ?? true}
                  onChange={(checked) => updatePreference("inAppNftSold", checked)}
                />
                <NotificationToggle
                  label="NFT Purchased"
                  description="When you purchase an NFT"
                  checked={preferences?.inAppNftPurchased ?? true}
                  onChange={(checked) => updatePreference("inAppNftPurchased", checked)}
                />
                <NotificationToggle
                  label="Price Alerts"
                  description="When NFT prices change significantly"
                  checked={preferences?.inAppPriceAlert ?? true}
                  onChange={(checked) => updatePreference("inAppPriceAlert", checked)}
                />
                <NotificationToggle
                  label="New Listings"
                  description="When new NFTs are listed in your interests"
                  checked={preferences?.inAppNewListing ?? true}
                  onChange={(checked) => updatePreference("inAppNewListing", checked)}
                />
                <NotificationToggle
                  label="Article Updates"
                  description="When your articles are published or distributed"
                  checked={preferences?.inAppArticle ?? true}
                  onChange={(checked) => updatePreference("inAppArticle", checked)}
                />
                <NotificationToggle
                  label="Payment Updates"
                  description="When you receive or send payments"
                  checked={preferences?.inAppPayment ?? true}
                  onChange={(checked) => updatePreference("inAppPayment", checked)}
                />
                <NotificationToggle
                  label="System Notifications"
                  description="Important system updates and alerts"
                  checked={preferences?.inAppSystem ?? true}
                  onChange={(checked) => updatePreference("inAppSystem", checked)}
                />
                <NotificationToggle
                  label="Promotions"
                  description="Special offers and promotional content"
                  checked={preferences?.inAppPromotion ?? false}
                  onChange={(checked) => updatePreference("inAppPromotion", checked)}
                />
              </div>
            </CardContent>
          )}
        </Card>
        
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email Notifications</CardTitle>
                  <CardDescription>
                    Notifications sent to your email address
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences?.emailEnabled ?? false}
                onCheckedChange={(checked) => toggleMasterSwitch("email", checked)}
              />
            </div>
          </CardHeader>
          {preferences?.emailEnabled && (
            <CardContent className="space-y-4">
              <Separator />
              <div className="grid gap-4">
                <NotificationToggle
                  label="NFT Sold"
                  description="Email when one of your NFTs is purchased"
                  checked={preferences?.emailNftSold ?? true}
                  onChange={(checked) => updatePreference("emailNftSold", checked)}
                />
                <NotificationToggle
                  label="NFT Purchased"
                  description="Email confirmation when you purchase an NFT"
                  checked={preferences?.emailNftPurchased ?? true}
                  onChange={(checked) => updatePreference("emailNftPurchased", checked)}
                />
                <NotificationToggle
                  label="Price Alerts"
                  description="Email when NFT prices change significantly"
                  checked={preferences?.emailPriceAlert ?? false}
                  onChange={(checked) => updatePreference("emailPriceAlert", checked)}
                />
                <NotificationToggle
                  label="New Listings"
                  description="Email about new NFTs in your interests"
                  checked={preferences?.emailNewListing ?? false}
                  onChange={(checked) => updatePreference("emailNewListing", checked)}
                />
                <NotificationToggle
                  label="Article Updates"
                  description="Email when your articles are published"
                  checked={preferences?.emailArticle ?? true}
                  onChange={(checked) => updatePreference("emailArticle", checked)}
                />
                <NotificationToggle
                  label="Payment Updates"
                  description="Email when you receive payments"
                  checked={preferences?.emailPayment ?? true}
                  onChange={(checked) => updatePreference("emailPayment", checked)}
                />
                <NotificationToggle
                  label="Weekly Summary"
                  description="Weekly digest of your activity and earnings"
                  checked={preferences?.emailWeeklySummary ?? true}
                  onChange={(checked) => updatePreference("emailWeeklySummary", checked)}
                />
              </div>
            </CardContent>
          )}
        </Card>
        
        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Push Notifications</CardTitle>
                  <CardDescription>
                    Browser push notifications (requires permission)
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences?.pushEnabled ?? false}
                onCheckedChange={(checked) => toggleMasterSwitch("push", checked)}
              />
            </div>
          </CardHeader>
          {preferences?.pushEnabled && (
            <CardContent className="space-y-4">
              <Separator />
              <div className="grid gap-4">
                <NotificationToggle
                  label="NFT Sold"
                  description="Push notification when your NFT is purchased"
                  checked={preferences?.pushNftSold ?? true}
                  onChange={(checked) => updatePreference("pushNftSold", checked)}
                />
                <NotificationToggle
                  label="NFT Purchased"
                  description="Push notification when you purchase an NFT"
                  checked={preferences?.pushNftPurchased ?? true}
                  onChange={(checked) => updatePreference("pushNftPurchased", checked)}
                />
                <NotificationToggle
                  label="Price Alerts"
                  description="Push notification for significant price changes"
                  checked={preferences?.pushPriceAlert ?? false}
                  onChange={(checked) => updatePreference("pushPriceAlert", checked)}
                />
                <NotificationToggle
                  label="Payment Updates"
                  description="Push notification when you receive payments"
                  checked={preferences?.pushPayment ?? true}
                  onChange={(checked) => updatePreference("pushPayment", checked)}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Reusable toggle component
function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
