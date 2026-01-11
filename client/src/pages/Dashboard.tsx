import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  FileText, 
  Link2, 
  Eye, 
  MousePointer,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Plus
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: topArticles } = trpc.analytics.topArticles.useQuery({ limit: 5 });
  const { data: topLinks } = trpc.analytics.topLinks.useQuery({ limit: 5 });

  const stats = [
    { 
      label: "Total Views", 
      value: summary?.totalViews || 0, 
      icon: Eye,
      color: "text-blue-400"
    },
    { 
      label: "Total Clicks", 
      value: summary?.totalClicks || 0, 
      icon: MousePointer,
      color: "text-green-400"
    },
    { 
      label: "Articles", 
      value: summary?.totalArticles || 0, 
      icon: FileText,
      color: "text-purple-400"
    },
    { 
      label: "Est. Revenue", 
      value: `$${parseFloat(summary?.totalRevenue || "0").toFixed(2)}`, 
      icon: DollarSign,
      color: "text-primary"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="gradient-text">{user?.name || "Creator"}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your content performance
            </p>
          </div>
          <Button onClick={() => setLocation("/articles/new")} className="btn-glow">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="card-glow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      {summaryLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/topics")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Discover Topics</h3>
                  <p className="text-sm text-muted-foreground">Find trending topics to write about</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/articles/new")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Generate Article</h3>
                  <p className="text-sm text-muted-foreground">Create AI-powered content</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/affiliate-links")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Manage Links</h3>
                  <p className="text-sm text-muted-foreground">Organize affiliate links</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Top Performing Articles
              </CardTitle>
              <CardDescription>Your best content by views</CardDescription>
            </CardHeader>
            <CardContent>
              {topArticles && topArticles.length > 0 ? (
                <div className="space-y-4">
                  {topArticles.map((article, i) => (
                    <div 
                      key={article.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {article.views} views · {article.clicks} clicks
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs status-${article.status}`}>
                        {article.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No articles yet</p>
                  <Button 
                    variant="link" 
                    className="text-primary"
                    onClick={() => setLocation("/articles/new")}
                  >
                    Create your first article
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Links */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Top Performing Links
              </CardTitle>
              <CardDescription>Your best affiliate links by clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {topLinks && topLinks.length > 0 ? (
                <div className="space-y-4">
                  {topLinks.map((link, i) => (
                    <div 
                      key={link.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {link.clicks} clicks · {link.conversions} conversions
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground">
                        {link.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No affiliate links yet</p>
                  <Button 
                    variant="link" 
                    className="text-primary"
                    onClick={() => setLocation("/affiliate-links")}
                  >
                    Add your first link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
