import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Package, Sparkles, Link2, Eye, ExternalLink, RefreshCw,
  CheckCircle, XCircle, Clock, FileText, Zap, TrendingUp
} from "lucide-react";

export default function ProductPages() {
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: articles, isLoading, refetch } = trpc.articles.list.useQuery({ status: "published" });
  const generateMutation = trpc.hiveMind.generateProductPage.useMutation();
  const batchGenerateMutation = trpc.hiveMind.batchGenerateProductPages.useMutation();
  
  const handleSelectAll = () => {
    if (selectedArticles.length === articles?.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles?.map(a => a.id) || []);
    }
  };
  
  const handleToggleArticle = (articleId: number) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };
  
  const handleGenerateSingle = async (articleId: number) => {
    try {
      const result = await generateMutation.mutateAsync({ articleId });
      toast.success(`Product page generated: ${result.title}`);
      refetch();
    } catch (error) {
      toast.error("Failed to generate product page");
    }
  };
  
  const handleBatchGenerate = async () => {
    if (selectedArticles.length === 0) {
      toast.error("Please select at least one article");
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await batchGenerateMutation.mutateAsync({ articleIds: selectedArticles });
      toast.success(`Generated ${result.generated} product pages, published ${result.published}`);
      setSelectedArticles([]);
      refetch();
    } catch (error) {
      toast.error("Failed to batch generate product pages");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Product Pages
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate branded product pages with affiliate links for self-publishing
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={handleBatchGenerate} 
              disabled={selectedArticles.length === 0 || isGenerating}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : `Generate ${selectedArticles.length} Pages`}
            </Button>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{articles?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Published Articles</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Package className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedArticles.length}</div>
                  <div className="text-sm text-muted-foreground">Selected for Generation</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Link2 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">Auto</div>
                  <div className="text-sm text-muted-foreground">Affiliate Link Insertion</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">SEO</div>
                  <div className="text-sm text-muted-foreground">Optimized Pages</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Feature Highlights */}
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Product Page Features
            </CardTitle>
            <CardDescription>
              Each product page is automatically optimized for maximum conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-background/50 border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  Affiliate Links
                </h4>
                <p className="text-sm text-muted-foreground">
                  Automatically inserts relevant CJ affiliate links from your approved advertisers
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  SEO Optimization
                </h4>
                <p className="text-sm text-muted-foreground">
                  Meta tags, structured data, and keyword optimization for search visibility
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-purple-500" />
                  Backlinks
                </h4>
                <p className="text-sm text-muted-foreground">
                  Internal linking structure to boost your main blog's SEO authority
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Article Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Articles for Product Pages</CardTitle>
                <CardDescription>
                  Choose published articles to convert into branded product pages
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedArticles.length === articles?.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading articles...</div>
            ) : articles && articles.length > 0 ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {articles.map((article) => (
                    <div 
                      key={article.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedArticles.includes(article.id) 
                          ? 'bg-primary/10 border-primary/50' 
                          : 'bg-card hover:bg-accent/50'
                      }`}
                      onClick={() => handleToggleArticle(article.id)}
                    >
                      <Checkbox 
                        checked={selectedArticles.includes(article.id)}
                        onCheckedChange={() => handleToggleArticle(article.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{article.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            SEO: {article.seoScore || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(article.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateSingle(article.id);
                        }}
                        disabled={generateMutation.isPending}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Published Articles</h3>
                <p className="text-muted-foreground mb-4">
                  Publish some articles first to generate product pages from them.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/articles'}>
                  Go to Articles
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
