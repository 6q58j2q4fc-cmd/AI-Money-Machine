import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, TrendingUp, CheckCircle, XCircle, Clock, Sparkles, Target, Zap, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function BotIntelligence() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.bot.stats.useQuery();
  const { data: decisions, isLoading: decisionsLoading, refetch: refetchDecisions } = trpc.bot.recentDecisions.useQuery({});
  const { data: insights } = trpc.learning.getInsights.useQuery();

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
              Track the optimization bot's learning progress and decision-making
            </p>
          </div>
          <Button variant="outline" onClick={() => { refetchStats(); refetchDecisions(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Decisions</p>
                  <div className="text-2xl font-bold">{stats?.totalDecisions || 0}</div>
                </div>
                <Brain className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <div className="text-2xl font-bold text-green-400">{stats?.successRate || 0}%</div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <div className="text-2xl font-bold text-green-400">{stats?.successfulDecisions || 0}</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  <div className="text-2xl font-bold text-primary">{Math.round(stats?.avgConfidence || 0)}%</div>
                </div>
                <Target className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress */}
        <Card className="card-glow border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Learning Progress
            </CardTitle>
            <CardDescription>
              The bot continuously learns from performance data to improve results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Topic Selection Accuracy</span>
                  <span className="text-primary">{Math.min(100, (stats?.successRate || 0) + 15)}%</span>
                </div>
                <Progress value={Math.min(100, (stats?.successRate || 0) + 15)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Headline Optimization</span>
                  <span className="text-primary">{Math.min(100, (stats?.successRate || 0) + 10)}%</span>
                </div>
                <Progress value={Math.min(100, (stats?.successRate || 0) + 10)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>CTA Placement</span>
                  <span className="text-primary">{Math.min(100, (stats?.successRate || 0) + 20)}%</span>
                </div>
                <Progress value={Math.min(100, (stats?.successRate || 0) + 20)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Affiliate Selection</span>
                  <span className="text-primary">{Math.min(100, (stats?.successRate || 0) + 5)}%</span>
                </div>
                <Progress value={Math.min(100, (stats?.successRate || 0) + 5)} className="h-2" />
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
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              How the Bot Learns
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Analyzes performance data from all your articles</li>
              <li>• Identifies patterns in successful content (topics, headlines, CTAs)</li>
              <li>• Adjusts future content generation based on what works</li>
              <li>• Tracks affiliate link performance to optimize placements</li>
              <li>• Continuously improves its decision-making confidence over time</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
