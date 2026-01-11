import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  BarChart3, 
  Eye, 
  MousePointer,
  DollarSign,
  FileText,
  Link2,
  TrendingUp,
  Loader2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function Analytics() {
  const [, setLocation] = useLocation();
  
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: topArticles } = trpc.analytics.topArticles.useQuery({ limit: 10 });
  const { data: topLinks } = trpc.analytics.topLinks.useQuery({ limit: 10 });

  // Mock chart data - in production this would come from analytics events
  const chartData = [
    { name: "Mon", views: 120, clicks: 45 },
    { name: "Tue", views: 180, clicks: 62 },
    { name: "Wed", views: 150, clicks: 55 },
    { name: "Thu", views: 220, clicks: 78 },
    { name: "Fri", views: 280, clicks: 95 },
    { name: "Sat", views: 190, clicks: 68 },
    { name: "Sun", views: 160, clicks: 52 },
  ];

  const stats = [
    { 
      label: "Total Views", 
      value: summary?.totalViews || 0, 
      icon: Eye,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10"
    },
    { 
      label: "Total Clicks", 
      value: summary?.totalClicks || 0, 
      icon: MousePointer,
      color: "text-green-400",
      bgColor: "bg-green-400/10"
    },
    { 
      label: "Articles", 
      value: summary?.totalArticles || 0, 
      icon: FileText,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10"
    },
    { 
      label: "Est. Revenue", 
      value: `$${parseFloat(summary?.totalRevenue || "0").toFixed(2)}`, 
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
  ];

  if (summaryLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your content performance and revenue
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="card-glow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Views & Clicks Chart */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Views & Clicks
              </CardTitle>
              <CardDescription>Weekly performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.65 0.15 160)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.65 0.15 160)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.02 260)" />
                    <YAxis stroke="oklch(0.65 0.02 260)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "oklch(0.16 0.01 260)", 
                        border: "1px solid oklch(0.28 0.015 260)",
                        borderRadius: "8px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="oklch(0.78 0.12 85)" 
                      fillOpacity={1} 
                      fill="url(#colorViews)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="oklch(0.65 0.15 160)" 
                      fillOpacity={1} 
                      fill="url(#colorClicks)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription>Estimated earnings by day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.map(d => ({ ...d, revenue: (d.clicks * 0.5).toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.02 260)" />
                    <YAxis stroke="oklch(0.65 0.02 260)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "oklch(0.16 0.01 260)", 
                        border: "1px solid oklch(0.28 0.015 260)",
                        borderRadius: "8px"
                      }}
                      formatter={(value: any) => [`$${value}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="oklch(0.78 0.12 85)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Top Articles
              </CardTitle>
              <CardDescription>Best performing content by views</CardDescription>
            </CardHeader>
            <CardContent>
              {topArticles && topArticles.length > 0 ? (
                <div className="space-y-3">
                  {topArticles.map((article, i) => (
                    <div 
                      key={article.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="w-3 h-3" />
                            {article.clicks}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-primary">
                          ${parseFloat(article.estimatedRevenue || "0").toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No articles yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Links */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Top Affiliate Links
              </CardTitle>
              <CardDescription>Best performing links by clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {topLinks && topLinks.length > 0 ? (
                <div className="space-y-3">
                  {topLinks.map((link, i) => (
                    <div 
                      key={link.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MousePointer className="w-3 h-3" />
                            {link.clicks} clicks
                          </span>
                          <span>{link.conversions} conversions</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-primary">
                          ${parseFloat(link.revenue || "0").toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No affiliate links yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
