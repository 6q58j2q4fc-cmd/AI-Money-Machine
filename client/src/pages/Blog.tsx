import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, ArrowRight, Calendar, Eye, Home, Search, Filter, Tag, TrendingUp, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";

// Categories for filtering
const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Investing" },
  { value: "productivity", label: "Productivity" },
  { value: "health", label: "Health & Wellness" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "business", label: "Business" },
  { value: "crypto", label: "Crypto & NFTs" },
  { value: "ai", label: "AI & Machine Learning" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "popular", label: "Most Popular" },
  { value: "trending", label: "Trending" },
];

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  const { data: articles, isLoading } = trpc.publicArticles.list.useQuery({});

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    let filtered = [...articles];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(query)) ||
        (article.keywords && (article.keywords as string[]).some(k => k.toLowerCase().includes(query)))
      );
    }
    
    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(article => {
        const keywords = article.keywords as string[] || [];
        const title = article.title.toLowerCase();
        const excerpt = (article.excerpt || "").toLowerCase();
        const categoryKeywords = {
          technology: ["tech", "software", "app", "device", "gadget", "computer"],
          finance: ["finance", "money", "invest", "stock", "bank", "budget", "savings"],
          productivity: ["productivity", "efficient", "organize", "time", "workflow", "tool"],
          health: ["health", "fitness", "wellness", "diet", "exercise", "medical"],
          lifestyle: ["lifestyle", "home", "travel", "fashion", "food", "living"],
          business: ["business", "entrepreneur", "startup", "marketing", "sales"],
          crypto: ["crypto", "bitcoin", "ethereum", "nft", "blockchain", "defi"],
          ai: ["ai", "artificial intelligence", "machine learning", "chatgpt", "automation"],
        };
        const catKeywords = categoryKeywords[selectedCategory as keyof typeof categoryKeywords] || [];
        return catKeywords.some(kw => 
          title.includes(kw) || 
          excerpt.includes(kw) || 
          keywords.some(k => k.toLowerCase().includes(kw))
        );
      });
    }
    
    // Sort
    switch (sortBy) {
      case "oldest":
        filtered.sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "trending":
        // Trending = recent + popular (weighted)
        filtered.sort((a, b) => {
          const aScore = (a.views || 0) + (new Date(a.publishedAt || 0).getTime() / 1000000000);
          const bScore = (b.views || 0) + (new Date(b.publishedAt || 0).getTime() / 1000000000);
          return bScore - aScore;
        });
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }
    
    return filtered;
  }, [articles, searchQuery, selectedCategory, sortBy]);

  // Get all unique keywords for tag cloud
  const allKeywords = useMemo(() => {
    if (!articles) return [];
    const keywordCounts: Record<string, number> = {};
    articles.forEach(article => {
      const keywords = article.keywords as string[] || [];
      keywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
    });
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword]) => keyword);
  }, [articles]);

  // Stats
  const totalArticles = articles?.length || 0;
  const totalViews = articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Blog - MoneyMachine | Expert Reviews, Tips & Recommendations</title>
        <meta name="description" content="Discover expert reviews, tips, and recommendations on technology, finance, productivity, and more. Find the best products and services to help you succeed." />
        <meta name="keywords" content="reviews, recommendations, best products, technology, finance, productivity, AI tools, crypto, NFT" />
        <meta property="og:title" content="MoneyMachine Blog - Expert Reviews & Recommendations" />
        <meta property="og:description" content="Discover expert reviews, tips, and recommendations on technology, finance, productivity, and more." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="/blog" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold gradient-text cursor-pointer">MoneyMachine</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/market">
              <Button variant="ghost" size="sm">NFT Market</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero with Search */}
      <section className="py-12 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Expert Reviews & Recommendations
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              Discover insights, tips, and curated recommendations to help you make smarter decisions
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mt-4">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                {totalArticles} Articles
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-primary" />
                {totalViews.toLocaleString()} Total Views
              </span>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles by title, keyword, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px] h-12">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px] h-12">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters */}
            {(searchQuery || selectedCategory !== "all") && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery("")}>
                    Search: "{searchQuery}" ×
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory("all")}>
                    {CATEGORIES.find(c => c.value === selectedCategory)?.label} ×
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Popular Tags */}
      {allKeywords.length > 0 && (
        <section className="container py-6 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Popular topics:</span>
            {allKeywords.slice(0, 10).map(keyword => (
              <Badge 
                key={keyword} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => setSearchQuery(keyword)}
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Results Count */}
      <section className="container pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredArticles.length} of {totalArticles} articles
          </p>
          {filteredArticles.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Sorted by: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </p>
          )}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
              <Link key={article.id} href={`/blog/${article.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg">
                  {/* Featured badge for first 3 articles */}
                  {index < 3 && sortBy === "popular" && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-primary text-primary-foreground">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Top {index + 1}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {article.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(article.publishedAt), "MMM d, yyyy")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {(article.views || 0).toLocaleString()}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-lg">
                      {article.title}
                    </CardTitle>
                    {article.excerpt && (
                      <CardDescription className="line-clamp-3 mt-2">
                        {article.excerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {article.keywords && (article.keywords as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(article.keywords as string[]).slice(0, 3).map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {(article.keywords as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(article.keywords as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <span className="text-sm text-primary flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
                      Read Full Article <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold mb-4">No Articles Found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Check back soon for new content!"}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <Button onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="container py-12">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get the latest reviews, tips, and recommendations delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input type="email" placeholder="Enter your email" className="flex-1" />
              <Button>Subscribe</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-8 bg-card/30">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">MoneyMachine</h3>
              <p className="text-sm text-muted-foreground">
                Your trusted source for expert reviews, recommendations, and insights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {CATEGORIES.slice(1, 5).map(cat => (
                  <li key={cat.value}>
                    <button 
                      onClick={() => setSelectedCategory(cat.value)}
                      className="hover:text-primary transition-colors"
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">More Categories</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {CATEGORIES.slice(5).map(cat => (
                  <li key={cat.value}>
                    <button 
                      onClick={() => setSelectedCategory(cat.value)}
                      className="hover:text-primary transition-colors"
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/"><span className="hover:text-primary transition-colors cursor-pointer">Home</span></Link></li>
                <li><Link href="/market"><span className="hover:text-primary transition-colors cursor-pointer">NFT Marketplace</span></Link></li>
                <li><a href="/sitemap.xml" target="_blank" className="hover:text-primary transition-colors flex items-center gap-1">Sitemap <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} MoneyMachine. All rights reserved.</p>
            <p className="mt-2 text-xs">
              Affiliate Disclosure: Some links on this site are affiliate links. We may earn a commission if you make a purchase through these links.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
