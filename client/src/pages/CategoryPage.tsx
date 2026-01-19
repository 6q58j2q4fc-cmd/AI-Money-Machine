import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { Loader2, ArrowRight, Calendar, Eye, Home, Search, ChevronRight, List, Grid3X3, Tag, TrendingUp, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";

// Category definitions with SEO metadata
const CATEGORY_DATA: Record<string, {
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  color: string;
}> = {
  technology: {
    label: "Technology",
    description: "Explore the latest in tech gadgets, software reviews, and digital innovation. Expert insights on smartphones, computers, smart home devices, and emerging technologies.",
    keywords: ["technology", "tech", "gadgets", "software", "digital", "innovation", "smart devices"],
    icon: "💻",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30"
  },
  finance: {
    label: "Finance & Investing",
    description: "Master your money with expert guides on personal finance, investing strategies, budgeting tips, and wealth building. From stocks to crypto, we cover it all.",
    keywords: ["finance", "investing", "money", "budget", "stocks", "wealth", "financial planning"],
    icon: "💰",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30"
  },
  productivity: {
    label: "Productivity",
    description: "Boost your efficiency with proven productivity tools, time management techniques, and workflow optimization strategies. Work smarter, not harder.",
    keywords: ["productivity", "efficiency", "time management", "tools", "workflow", "organization"],
    icon: "⚡",
    color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
  },
  health: {
    label: "Health & Wellness",
    description: "Your guide to better health through nutrition, fitness, mental wellness, and lifestyle choices. Evidence-based advice for a healthier, happier life.",
    keywords: ["health", "wellness", "fitness", "nutrition", "mental health", "lifestyle"],
    icon: "🏃",
    color: "from-red-500/20 to-pink-500/20 border-red-500/30"
  },
  lifestyle: {
    label: "Lifestyle",
    description: "Enhance your daily life with curated recommendations for home, travel, fashion, and entertainment. Discover products and tips that elevate your lifestyle.",
    keywords: ["lifestyle", "home", "travel", "fashion", "entertainment", "living"],
    icon: "🌟",
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/30"
  },
  business: {
    label: "Business",
    description: "Grow your business with expert advice on entrepreneurship, marketing, management, and scaling strategies. From startups to enterprises, we've got you covered.",
    keywords: ["business", "entrepreneurship", "marketing", "management", "startup", "growth"],
    icon: "📈",
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30"
  },
  crypto: {
    label: "Crypto & NFTs",
    description: "Navigate the world of cryptocurrency, blockchain technology, and NFTs. Expert analysis, market insights, and guides for both beginners and advanced traders.",
    keywords: ["crypto", "cryptocurrency", "NFT", "blockchain", "bitcoin", "ethereum", "web3"],
    icon: "🪙",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30"
  },
  ai: {
    label: "AI & Machine Learning",
    description: "Stay ahead with the latest in artificial intelligence, machine learning tools, and AI-powered solutions. From ChatGPT to automation, explore the AI revolution.",
    keywords: ["AI", "artificial intelligence", "machine learning", "automation", "ChatGPT", "ML"],
    icon: "🤖",
    color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30"
  }
};

// Sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "popular", label: "Most Popular" },
  { value: "alphabetical", label: "A-Z" },
];

const ARTICLES_PER_PAGE = 24;

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.slug as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const categoryData = CATEGORY_DATA[categorySlug];
  
  // Fetch all published articles
  const { data: allArticles, isLoading } = trpc.publicArticles.list.useQuery({});

  // Clean up article excerpt
  const cleanExcerpt = (text: string | null | undefined): string => {
    if (!text) return "";
    return text
      .replace(/( - Top Picks & Reviews)+/g, "")
      .replace(/Top Picks & Reviews/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Filter articles by category keywords
  const filteredArticles = useMemo(() => {
    if (!allArticles || !categoryData) return [];
    
    const keywords = categoryData.keywords.map(k => k.toLowerCase());
    
    return allArticles.filter(article => {
      const titleLower = article.title.toLowerCase();
      const excerptLower = (article.excerpt || "").toLowerCase();
      const articleKeywords = (article.keywords || []).map((k: string) => k.toLowerCase());
      
      // Check if article matches category
      return keywords.some(keyword => 
        titleLower.includes(keyword) || 
        excerptLower.includes(keyword) ||
        articleKeywords.some((ak: string) => ak.includes(keyword) || keyword.includes(ak))
      );
    });
  }, [allArticles, categoryData]);

  // Apply search and sort
  const processedArticles = useMemo(() => {
    let result = [...filteredArticles];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(article => 
        article.title.toLowerCase().includes(query) ||
        (article.excerpt || "").toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime());
        break;
      case "popular":
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "alphabetical":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // newest
        result.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }
    
    return result;
  }, [filteredArticles, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(processedArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = processedArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // If category not found
  if (!categoryData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-8">The category you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{categoryData.label} Articles | Benjamin Franklin's Top New Brands & Recommendations</title>
        <meta name="description" content={categoryData.description} />
        <meta name="keywords" content={categoryData.keywords.join(", ")} />
        <link rel="canonical" href={`${siteUrl}/blog/category/${categorySlug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${categoryData.label} Articles | Benjamin Franklin's Recommendations`} />
        <meta property="og:description" content={categoryData.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/blog/category/${categorySlug}`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${categoryData.label} Articles | Benjamin Franklin's Recommendations`} />
        <meta name="twitter:description" content={categoryData.description} />
        
        {/* Structured Data - BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": siteUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": `${siteUrl}/blog`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": categoryData.label,
                "item": `${siteUrl}/blog/category/${categorySlug}`
              }
            ]
          })}
        </script>
        
        {/* Structured Data - CollectionPage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": `${categoryData.label} Articles`,
            "description": categoryData.description,
            "url": `${siteUrl}/blog/category/${categorySlug}`,
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": filteredArticles.length,
              "itemListElement": paginatedArticles.slice(0, 10).map((article, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `${siteUrl}/blog/${article.slug}`
              }))
            }
          })}
        </script>
      </Helmet>

      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/blog">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl">💰</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-primary">Benjamin Franklin's</span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">Top New Brands</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/rss.xml">
              <Button variant="ghost" size="sm">
                <Rss className="w-4 h-4 mr-2" />
                RSS
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" size="sm">All Articles</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="container py-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{categoryData.label}</span>
        </nav>
      </div>

      {/* Hero Section */}
      <div className={`bg-gradient-to-br ${categoryData.color} border-b`}>
        <div className="container py-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{categoryData.icon}</span>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{categoryData.label}</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">{categoryData.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <Badge variant="secondary" className="text-sm">
              <Tag className="w-3 h-3 mr-1" />
              {filteredArticles.length} Articles
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              {filteredArticles.reduce((sum, a) => sum + (a.views || 0), 0)} Total Views
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${categoryData.label.toLowerCase()} articles...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * ARTICLES_PER_PAGE, processedArticles.length)} of {processedArticles.length} articles
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Articles Grid/List */}
        {!isLoading && paginatedArticles.length > 0 && (
          <div className={viewMode === "grid" 
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {paginatedArticles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group">
                  <CardContent className={viewMode === "grid" ? "p-6" : "p-4 flex gap-4"}>
                    <div className={viewMode === "list" ? "flex-1" : ""}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3" />
                        {article.publishedAt 
                          ? format(new Date(article.publishedAt), "MMM d, yyyy")
                          : "No date"
                        }
                        <span className="mx-1">•</span>
                        <Eye className="w-3 h-3" />
                        {article.views || 0}
                      </div>
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {cleanExcerpt(article.excerpt || article.metaDescription)}
                      </p>
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(article.keywords as string[]).slice(0, 3).map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {(article.keywords as string[]).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(article.keywords as string[]).length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm mr-1">Read</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && paginatedArticles.length === 0 && (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No articles match "${searchQuery}" in ${categoryData.label}`
                : `No articles in ${categoryData.label} category yet`
              }
            </p>
            <Link href="/blog">
              <Button variant="outline">
                Browse All Articles
              </Button>
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {currentPage > 2 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>1</Button>
                  {currentPage > 3 && <span className="px-2 text-muted-foreground">...</span>}
                </>
              )}
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                if (page > totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    {page}
                  </Button>
                );
              })}
              
              {currentPage < totalPages - 1 && (
                <>
                  {currentPage < totalPages - 2 && <span className="px-2 text-muted-foreground">...</span>}
                  <Button variant="ghost" size="sm" onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{totalPages}</Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Other Categories */}
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">Explore Other Categories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(CATEGORY_DATA)
              .filter(([slug]) => slug !== categorySlug)
              .map(([slug, data]) => (
                <Link key={slug} href={`/blog/category/${slug}`}>
                  <Card className={`bg-gradient-to-br ${data.color} hover:scale-105 transition-transform cursor-pointer`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-2xl">{data.icon}</span>
                      <div>
                        <h3 className="font-semibold">{data.label}</h3>
                        <p className="text-xs text-muted-foreground">Browse articles</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MoneyMachine. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
              <Link href="/rss.xml" className="text-sm text-muted-foreground hover:text-foreground">RSS Feed</Link>
              <Link href="/sitemap.xml" className="text-sm text-muted-foreground hover:text-foreground">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
