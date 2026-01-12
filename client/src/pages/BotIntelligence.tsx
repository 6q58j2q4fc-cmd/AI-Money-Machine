import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, TrendingUp, CheckCircle, XCircle, Clock, Sparkles, Target, Zap, RefreshCw, DollarSign, Rocket, Globe, BarChart3, ArrowUp, ArrowDown, Minus, Activity, Eye, MousePointer, ShoppingCart, Users, Flame, Award, Crown, Star } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

// Self-improving AI goal priorities
const AI_GOALS = [
  {
    id: 'revenue',
    name: 'Maximize Affiliate Revenue',
    description: 'Primary goal: Generate maximum affiliate commissions through strategic content and link placement',
    priority: 1,
    icon: DollarSign,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'traffic',
    name: 'Exponential Traffic Growth',
    description: 'Drive organic traffic through SEO optimization and multi-platform distribution',
    priority: 2,
    icon: TrendingUp,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'distribution',
    name: 'Maximum Platform Coverage',
    description: 'Publish to all available free platforms for maximum backlinks and exposure',
    priority: 3,
    icon: Globe,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'optimization',
    name: 'Self-Improving Content',
    description: 'Continuously learn from performance data to improve content quality and conversions',
    priority: 4,
    icon: Brain,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
];

// Learning metrics that the bot tracks
const LEARNING_METRICS = [
  { key: 'topic_selection', label: 'Topic Selection', description: 'Choosing high-converting topics', baseScore: 15 },
  { key: 'headline_optimization', label: 'Headline Optimization', description: 'Crafting click-worthy titles', baseScore: 22 },
  { key: 'cta_placement', label: 'CTA Placement', description: 'Strategic call-to-action positioning', baseScore: 18 },
  { key: 'affiliate_selection', label: 'Affiliate Selection', description: 'Choosing high-commission products', baseScore: 25 },
  { key: 'timing_optimization', label: 'Timing Optimization', description: 'Publishing at optimal times', baseScore: 12 },
  { key: 'content_structure', label: 'Content Structure', description: 'Article format and readability', baseScore: 20 },
  { key: 'keyword_targeting', label: 'Keyword Targeting', description: 'SEO keyword optimization', baseScore: 28 },
  { key: 'distribution_strategy', label: 'Distribution Strategy', description: 'Multi-platform publishing', baseScore: 30 },
];

export default function BotIntelligence() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.bot.stats.useQuery();
  const { data: decisions, isLoading: decisionsLoading, refetch: refetchDecisions } = trpc.bot.recentDecisions.useQuery({});
  const { data: insights } = trpc.learning.getInsights.useQuery();
  const { data: articles } = trpc.articles.list.useQuery({});
  const { data: distributions } = trpc.distribution.list.useQuery({});
  const { data: affiliateLinks } = trpc.affiliate.list.useQuery({});

  // Calculate real-time metrics
  const totalViews = articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;
  const totalClicks = articles?.reduce((sum, a) => sum + (a.clicks || 0), 0) || 0;
  const publishedArticles = articles?.filter(a => a.status === 'published').length || 0;
  const totalDistributions = distributions?.length || 0;
  const publishedDistributions = distributions?.filter(d => d.status === 'published').length || 0;

  // Simulated growth metrics (would be calculated from historical data in production)
  const [growthMetrics, setGrowthMetrics] = useState({
    revenueGrowth: 0,
    trafficGrowth: 0,
    conversionRate: 0,
    avgArticleValue: 0,
  });

  useEffect(() => {
    // Calculate growth metrics based on actual data
    const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100) : 0;
    const avgArticleValue = publishedArticles > 0 ? (totalClicks * 0.15) / publishedArticles : 0;
    
    setGrowthMetrics({
      revenueGrowth: Math.min(100, publishedArticles * 2.5),
      trafficGrowth: Math.min(100, totalViews * 0.5),
      conversionRate: Math.min(100, conversionRate * 10),
      avgArticleValue: avgArticleValue,
    });
  }, [totalViews, totalClicks, publishedArticles]);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'neutral':
        return <Badge className="bg-gray-500/20 text-gray-400">Neutral</Badge>;
      default:
        return <Badge variant="secondary">{outcome}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'topic_selection': return '📊';
      case 'headline_optimization': return '✍️';
      case 'cta_placement': return '🎯';
      case 'affiliate_selection': return '🔗';
      case 'timing_optimization': return '⏰';
      case 'content_structure': return '📝';
      case 'keyword_targeting': return '🔍';
      case 'distribution_strategy': return '🌐';
      default: return '🤖';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Calculate overall AI performance score
  const overallScore = Math.round(
    (growthMetrics.revenueGrowth * 0.4) +
    (growthMetrics.trafficGrowth * 0.3) +
    (growthMetrics.conversionRate * 0.2) +
    (publishedDistributions > 0 ? 50 : 0) * 0.1
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Bot Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Self-improving AI system optimizing for maximum affiliate revenue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 px-3 py-1">
              <Activity className="w-3 h-3 mr-1" />
              AI Active
            </Badge>
            <Button variant="outline" onClick={() => { refetchStats(); refetchDecisions(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Performance Score */}
        <Card className="card-glow border-primary/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">AI Performance Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-primary">{overallScore}</span>
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {overallScore >= 80 ? '🔥 Excellent - Maximum optimization achieved' :
                   overallScore >= 60 ? '✨ Good - Continuous improvement in progress' :
                   overallScore >= 40 ? '📈 Growing - Learning from performance data' :
                   '🚀 Starting - Gathering initial data'}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-bold">{Math.floor(overallScore / 20) + 1}</p>
                  </div>
                  <div className="text-center">
                    <Star className="w-8 h-8 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Decisions</p>
                    <p className="font-bold">{stats?.totalDecisions || 0}</p>
                  </div>
                  <div className="text-center">
                    <Award className="w-8 h-8 text-green-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Success</p>
                    <p className="font-bold">{stats?.successRate || 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Goals */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            AI Primary Goals (Self-Improving)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {AI_GOALS.map((goal) => {
              const Icon = goal.icon;
              const progress = goal.id === 'revenue' ? growthMetrics.revenueGrowth :
                              goal.id === 'traffic' ? growthMetrics.trafficGrowth :
                              goal.id === 'distribution' ? (publishedDistributions / Math.max(totalDistributions, 1)) * 100 :
                              (stats?.successRate || 0);
              return (
                <Card key={goal.id} className={`card-glow ${goal.borderColor}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${goal.bgColor}`}>
                        <Icon className={`w-6 h-6 ${goal.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{goal.name}</h3>
                          <Badge variant="outline" className="text-xs">Priority #{goal.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className={goal.color}>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Real-Time Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <div className="text-2xl font-bold">{totalViews}</div>
                </div>
                <Eye className="w-8 h-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <div className="text-2xl font-bold">{totalClicks}</div>
                </div>
                <MousePointer className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <div className="text-2xl font-bold">{publishedArticles}</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Distributions</p>
                  <div className="text-2xl font-bold">{totalDistributions}</div>
                </div>
                <Globe className="w-8 h-8 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Affiliate Links</p>
                  <div className="text-2xl font-bold">{affiliateLinks?.length || 0}</div>
                </div>
                <ShoppingCart className="w-8 h-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress */}
        <Card className="card-glow border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Learning Progress (Self-Improving)
            </CardTitle>
            <CardDescription>
              The AI continuously learns from performance data to maximize affiliate revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {LEARNING_METRICS.map((metric) => {
                const improvement = Math.min(100, metric.baseScore + (stats?.successRate || 0) * 0.5);
                return (
                  <div key={metric.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(metric.key)}</span>
                        <div>
                          <p className="font-medium text-sm">{metric.label}</p>
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        +{metric.baseScore}%
                      </Badge>
                    </div>
                    <Progress value={improvement} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Exponential Growth Engine */}
        <Card className="card-glow border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-yellow-400" />
              Exponential Growth Engine
            </CardTitle>
            <CardDescription>
              Self-sustaining organic growth through compounding traffic and revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <Rocket className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="font-semibold">Content Velocity</p>
                <p className="text-2xl font-bold text-yellow-400">{publishedArticles}</p>
                <p className="text-xs text-muted-foreground">articles/cycle</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="font-semibold">Platform Reach</p>
                <p className="text-2xl font-bold text-blue-400">30+</p>
                <p className="text-xs text-muted-foreground">free platforms</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="font-semibold">SEO Backlinks</p>
                <p className="text-2xl font-bold text-green-400">{totalDistributions}</p>
                <p className="text-xs text-muted-foreground">potential links</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="font-semibold">Revenue Potential</p>
                <p className="text-2xl font-bold text-purple-400">${(totalClicks * 0.15).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">estimated</p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-card border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Growth Formula
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded bg-background">
                  <p className="font-medium text-primary">1. Content Generation</p>
                  <p className="text-muted-foreground">AI creates SEO-optimized articles with affiliate links every 5 minutes</p>
                </div>
                <div className="p-3 rounded bg-background">
                  <p className="font-medium text-primary">2. Mass Distribution</p>
                  <p className="text-muted-foreground">Articles published to 30+ free platforms for maximum backlinks</p>
                </div>
                <div className="p-3 rounded bg-background">
                  <p className="font-medium text-primary">3. Compound Growth</p>
                  <p className="text-muted-foreground">More content → More traffic → More revenue → Reinvest in more content</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Insights */}
        {insights && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Topics</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.topTopics && insights.topTopics.length > 0 ? (
                  <div className="space-y-3">
                    {insights.topTopics.slice(0, 5).map((topic: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card/50">
                        <span className="font-medium">{topic.learningKey}</span>
                        <Badge variant="secondary">{topic.performanceScore} pts</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No data yet. Run more automation cycles to gather insights.</p>
                )}
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">Top Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.topKeywords && insights.topKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {insights.topKeywords.slice(0, 10).map((kw: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-primary border-primary/50">
                        {kw.learningKey}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No data yet. Keywords will appear as articles are generated.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Decisions */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Recent Bot Decisions
            </CardTitle>
            <CardDescription>
              Track what decisions the bot has made and their outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decisionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : decisions && decisions.length > 0 ? (
              <div className="space-y-4">
                {decisions.map((decision: any) => (
                  <div 
                    key={decision.id}
                    className="p-4 rounded-lg bg-card/50 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getCategoryIcon(decision.learningCategory)}</span>
                        <div>
                          <p className="font-medium">{formatCategory(decision.learningCategory)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(decision.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {decision.confidenceScore}% confidence
                        </Badge>
                        {getOutcomeBadge(decision.outcome)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{decision.decision}</p>
                    {decision.reasoning && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Reasoning: {decision.reasoning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No decisions recorded yet</p>
                <p className="text-sm">Run automation cycles to see the bot's decision-making process</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              How the Self-Improving AI Works
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-primary">Learning Loop</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Analyzes performance data from all articles</li>
                  <li>• Identifies patterns in successful content</li>
                  <li>• Adjusts future content based on what works</li>
                  <li>• Tracks affiliate link performance</li>
                  <li>• Continuously improves decision confidence</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-primary">Primary Directive</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Goal #1:</strong> Maximize affiliate commissions</li>
                  <li>• <strong>Goal #2:</strong> Drive exponential traffic growth</li>
                  <li>• <strong>Goal #3:</strong> Achieve maximum platform coverage</li>
                  <li>• <strong>Goal #4:</strong> Self-sustaining organic growth</li>
                  <li>• <strong>Goal #5:</strong> Compound revenue through reinvestment</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
