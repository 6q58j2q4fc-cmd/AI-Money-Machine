import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Search, Filter, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";

type NotificationType = "nft_sold" | "nft_purchased" | "price_alert" | "new_listing" | "article" | "payment" | "system" | "promotion" | "all";

const notificationTypeLabels: Record<NotificationType, string> = {
  nft_sold: "NFT Sold",
  nft_purchased: "NFT Purchased",
  price_alert: "Price Alert",
  new_listing: "New Listing",
  article: "Article",
  payment: "Payment",
  system: "System",
  promotion: "Promotion",
  all: "All Types",
};

const notificationTypeColors: Record<string, string> = {
  nft_sold: "bg-green-500/20 text-green-400 border-green-500/30",
  nft_purchased: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  price_alert: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  new_listing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  article: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  payment: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  system: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  promotion: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const notificationTypeIcons: Record<string, string> = {
  nft_sold: "🎉",
  nft_purchased: "🎨",
  price_alert: "📈",
  new_listing: "✨",
  article: "📝",
  payment: "💰",
  system: "🔔",
  promotion: "🎁",
};

export default function NotificationHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.notifications.getNotifications.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    unreadOnly: showUnreadOnly,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Notification marked as read");
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Notification deleted");
    },
  });

  // Filter notifications based on search and type
  const filteredNotifications = data?.notifications?.filter((notification) => {
    const matchesSearch = searchQuery === "" || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || notification.type === typeFilter;
    
    return matchesSearch && matchesType;
  }) || [];

  const unreadCount = data?.unreadCount || 0;
  const totalCount = data?.notifications?.length || 0;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8 text-yellow-400" />
              Notification History
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your notifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            <Link href="/notifications">
              <Button variant="default" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-sm text-muted-foreground">Total Notifications</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-400">{unreadCount}</div>
              <p className="text-sm text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-400">{totalCount - unreadCount}</div>
              <p className="text-sm text-muted-foreground">Read</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-400">{filteredNotifications.length}</div>
              <p className="text-sm text-muted-foreground">Filtered Results</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(notificationTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {value !== "all" && notificationTypeIcons[value]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showUnreadOnly ? "default" : "outline"}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                {showUnreadOnly ? "Showing Unread" : "Show Unread Only"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || typeFilter !== "all" || showUnreadOnly
                    ? "Try adjusting your filters"
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`p-4 rounded-lg transition-colors ${
                        notification.isRead
                          ? "bg-background/50"
                          : "bg-yellow-500/5 border border-yellow-500/20"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-2xl">
                          {notificationTypeIcons[notification.type] || "🔔"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{notification.title}</h4>
                            <Badge
                              variant="outline"
                              className={notificationTypeColors[notification.type] || ""}
                            >
                              {notificationTypeLabels[notification.type as NotificationType] || notification.type}
                            </Badge>
                            {!notification.isRead && (
                              <Badge variant="default" className="bg-yellow-500 text-black">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </span>
                            {notification.linkUrl && (
                              <Link href={notification.linkUrl}>
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                  {notification.linkText || "View"} <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this notification? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteNotificationMutation.mutate({ notificationId: notification.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                    {index < filteredNotifications.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
