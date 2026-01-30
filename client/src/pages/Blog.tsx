import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, ArrowRight, Calendar, Eye, Home, Search, Filter, Tag, TrendingUp, Clock, ExternalLink, Archive, ChevronDown, ChevronRight, ChevronLeft, List, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, getYear, getMonth } from "date-fns";
import { Helmet } from "react-helmet-async";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdPlaceholder } from "@/components/AdSense";

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
  { value: "alphabetical", label: "A-Z" },
];

// Month names
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Articles per page
const ARTICLES_PER_PAGE = 24;

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [selectedArchive, setSelectedArchive] = useState<{ year: number; month: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch ALL published articles (no limit)
  const { data: articles, isLoading } = trpc.publicArticles.list.useQuery({});

  // Clean up article excerpt/description for display
  const cleanExcerpt = (text: string | null | undefined): string => {
    if (!text) return "";
    // Remove repetitive "Top Picks & Reviews" patterns
    return text
      .replace(/( - Top Picks & Reviews)+/g, "")
      .replace(/Top Picks & Reviews/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Define article type for archive
  type ArticleType = NonNullable<typeof articles>[number];
  
  // Build archive structure (year -> month -> articles)
  const archiveStructure = useMemo(() => {
    if (!articles) return new Map<number, Map<number, ArticleType[]>>();
    
    const archive = new Map<number, Map<number, ArticleType[]>>();
    
    articles.forEach(article => {
      const date = article.publishedAt ? new Date(article.publishedAt) : new Date();
      const year = getYear(date);
      const month = getMonth(date);
      
      if (!archive.has(year)) {
        archive.set(year, new Map());
      }
      const yearMap = archive.get(year)!;
      
      if (!yearMap.has(month)) {
        yearMap.set(month, []);
      }
      yearMap.get(month)!.push(article);
    });
    
    return archive;
  }, [articles]);

  // Get sorted years for archive
  const sortedYears = useMemo(() => {
    return Array.from(archiveStructure.keys()).sort((a, b) => b - a);
  }, [archiveStructure]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    let filtered = [...articles];
    
    // Archive filter
    if (selectedArchive) {
      filtered = filtered.filter(article => {
        const date = article.publishedAt ? new Date(article.publishedAt) : new Date();
        return getYear(date) === selectedArchive.year && getMonth(date) === selectedArchive.month;
      });
    }
    
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
          health: ["health", "fitness", "wellness", "diet", "exercise", "medical", "nutrition", "gut"],
          lifestyle: ["lifestyle", "home", "travel", "fashion", "food", "living", "gardening", "pet"],
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
        filtered.sort((a, b) => {
          const aScore = (a.views || 0) + (new Date(a.publishedAt || 0).getTime() / 1000000000);
          const bScore = (b.views || 0) + (new Date(b.publishedAt || 0).getTime() / 1000000000);
          return bScore - aScore;
        });
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }
    
    return filtered;
  }, [articles, searchQuery, selectedCategory, sortBy, selectedArchive]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    return filteredArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  }, [filteredArticles, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, selectedArchive]);

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

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const handleArchiveSelect = (year: number, month: number) => {
    if (selectedArchive?.year === year && selectedArchive?.month === month) {
      setSelectedArchive(null);
    } else {
      setSelectedArchive({ year, month });
    }
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedArchive(null);
    setCurrentPage(1);
  };

  // Pagination controls
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Organization JSON-LD for the blog
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Benjamin Franklin's Recommendations",
    "alternateName": "Benjamin Franklin's Top New Brands",
    "url": typeof window !== 'undefined' ? window.location.origin : '',
    "logo": typeof window !== 'undefined' ? `${window.location.origin}/benjamin-franklin-logo.png` : '',
    "description": "Your trusted source for honest product reviews, brand recommendations, and buying guides.",
    "foundingDate": "2024",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "English"
    }
  };

  // WebSite JSON-LD for search box
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Benjamin Franklin's Recommendations",
    "url": typeof window !== 'undefined' ? window.location.origin : '',
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": typeof window !== 'undefined' ? `${window.location.origin}/blog?search={search_term_string}` : ''
      },
      "query-input": "required name=search_term_string"
    }
  };

  // CollectionPage JSON-LD for the blog listing
  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Benjamin Franklin's Top New Brands & Recommendations",
    "description": "Your trusted source for honest product reviews, brand recommendations, and buying guides.",
    "url": typeof window !== 'undefined' ? `${window.location.origin}/blog` : '',
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": totalArticles,
      "itemListElement": paginatedArticles.slice(0, 10).map((article, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": typeof window !== 'undefined' ? `${window.location.origin}/article/${article.slug}` : '',
        "name": article.title
      }))
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Benjamin Franklin's Top New Brands & Recommendations | Trusted Reviews Since 2024</title>
        <meta name="description" content="Your trusted source for honest product reviews, brand recommendations, and buying guides. Benjamin Franklin's curates the best products across technology, finance, health, and lifestyle to help you make informed decisions." />
        <meta name="keywords" content="product reviews, brand recommendations, buying guides, best products 2026, trusted reviews, expert recommendations, top brands, consumer advice" />
        <meta property="og:title" content="Benjamin Franklin's Top New Brands & Recommendations" />
        <meta property="og:description" content="Your trusted source for honest product reviews and brand recommendations. Expert-curated guides to help you find the best products." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-blog.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og-blog.png" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="/blog" />
        <link rel="alternate" type="application/rss+xml" title="Benjamin Franklin's Reviews RSS" href="/rss.xml" />
      </Helmet>

      {/* Header - Clean White Theme */}
      <header className="border-b border-amber-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container py-3 flex items-center justify-between">
          <Link href="/blog">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img 
                src="/benjamin-franklin-logo.png" 
                alt="Benjamin Franklin" 
                className="w-12 h-12 rounded-full border-2 border-amber-400 shadow-md group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-lg font-serif font-bold text-amber-800">Benjamin Franklin's</span>
                <span className="text-xs text-amber-600 -mt-0.5">Top New Brands & Recommendations</span>
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-3">
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900 transition-colors">
              <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                <ExternalLink className="w-3 h-3" />
                RSS
              </Badge>
            </a>
            <Link href="/about">
              <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900 hover:bg-amber-50">About Us</Button>
            </Link>
            <Link href="/market">
              <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900 hover:bg-amber-50">NFT Market</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900 hover:bg-amber-50">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero with Search - Clean White Background */}
      <section className="bg-gradient-to-b from-amber-50 to-white py-16 text-center border-b border-amber-100">
        <div className="container">
          {/* Hero Image */}
          <div className="mb-6">
            <img 
              src="/benjamin-franklin-logo.png" 
              alt="Benjamin Franklin" 
              className="w-24 h-24 mx-auto rounded-full border-4 border-amber-400 shadow-lg"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-gray-900">
            <span className="text-amber-700">Benjamin Franklin's</span> Top Picks
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto font-light">
            "An investment in knowledge pays the best interest." — Honest reviews, trusted recommendations, and expert buying guides since 2024.
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-8 text-sm">
            <span className="flex items-center gap-2 text-amber-700 bg-amber-100 px-4 py-2 rounded-full">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">{totalArticles.toLocaleString()}</span> Articles
            </span>
            <span className="flex items-center gap-2 text-amber-700 bg-amber-100 px-4 py-2 rounded-full">
              <Eye className="w-4 h-4" />
              <span className="font-semibold">{totalViews.toLocaleString()}</span> Total Views
            </span>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="max-w-4xl mx-auto container">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
              <Input
                type="text"
                placeholder="Search articles by title, keyword, or topic..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-12 border-amber-200 focus:border-amber-400 focus:ring-amber-400 bg-white"
              />
            </div>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-48 h-12">
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
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-44 h-12">
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
          {(searchQuery || selectedCategory !== "all" || selectedArchive) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                  <button onClick={() => { setSelectedCategory("all"); setCurrentPage(1); }} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {selectedArchive && (
                <Badge variant="secondary" className="gap-1">
                  {MONTH_NAMES[selectedArchive.month]} {selectedArchive.year}
                  <button onClick={() => { setSelectedArchive(null); setCurrentPage(1); }} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Popular Tags */}
      {allKeywords.length > 0 && (
        <section className="bg-white py-6 border-b border-amber-100">
          <div className="container flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 mr-2 font-medium">Popular topics:</span>
            {allKeywords.slice(0, 10).map(keyword => (
              <Badge 
                key={keyword} 
                variant="outline" 
                className="cursor-pointer border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                onClick={() => { setSearchQuery(keyword); setCurrentPage(1); }}
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="bg-white py-8 border-b border-amber-100">
        <div className="container">
        <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2 text-gray-800">
          <Tag className="w-5 h-5 text-amber-600" />
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.filter(c => c.value !== "all").map(category => {
            const categoryColors: Record<string, string> = {
              technology: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/50",
              finance: "from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/50",
              productivity: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:border-yellow-500/50",
              health: "from-red-500/20 to-pink-500/20 border-red-500/30 hover:border-red-500/50",
              lifestyle: "from-purple-500/20 to-violet-500/20 border-purple-500/30 hover:border-purple-500/50",
              business: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30 hover:border-indigo-500/50",
              crypto: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 hover:border-amber-500/50",
              ai: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30 hover:border-cyan-500/50",
            };
            const categoryIcons: Record<string, string> = {
              technology: "💻",
              finance: "💰",
              productivity: "⚡",
              health: "🏃",
              lifestyle: "🌟",
              business: "📈",
              crypto: "🪙",
              ai: "🤖",
            };
            return (
              <Link key={category.value} href={`/blog/category/${category.value}`}>
                <Card className={`bg-gradient-to-br ${categoryColors[category.value] || ''} border transition-all hover:scale-105 cursor-pointer h-full`}>
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl block mb-1">{categoryIcons[category.value] || '📁'}</span>
                    <span className="text-xs font-medium">{category.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className="bg-white min-h-screen">
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Archive */}
          <aside className="lg:w-64 shrink-0">
            <Card className="sticky top-24 border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Archive className="w-5 h-5" />
                  Article Archive
                </CardTitle>
                <CardDescription>
                  Browse articles by date
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {sortedYears.map(year => {
                    const yearData = archiveStructure.get(year)!;
                    const yearTotal = Array.from(yearData.values()).reduce((sum, arr) => sum + arr.length, 0);
                    const isExpanded = expandedYears.has(year);
                    
                    return (
                      <Collapsible key={year} open={isExpanded} onOpenChange={() => toggleYear(year)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <span className="font-medium flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {year}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {yearTotal}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 space-y-1 py-1">
                            {Array.from(yearData.entries())
                              .sort((a, b) => b[0] - a[0])
                              .map(([month, monthArticles]) => (
                                <button
                                  key={month}
                                  onClick={() => handleArchiveSelect(year, month)}
                                  className={`flex items-center justify-between w-full p-2 rounded-md text-sm transition-colors ${
                                    selectedArchive?.year === year && selectedArchive?.month === month
                                      ? "bg-primary/20 text-primary"
                                      : "hover:bg-muted/50"
                                  }`}
                                >
                                  <span>{MONTH_NAMES[month]}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {monthArticles.length}
                                  </Badge>
                                </button>
                              ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
                
                {/* View All Button */}
                {selectedArchive && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => { setSelectedArchive(null); setCurrentPage(1); }}
                  >
                    View All Articles
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedArticles.length > 0 ? ((currentPage - 1) * ARTICLES_PER_PAGE + 1) : 0}-{Math.min(currentPage * ARTICLES_PER_PAGE, filteredArticles.length)} of {filteredArticles.length} articles
                  {selectedArchive && (
                    <span className="ml-1">
                      from {MONTH_NAMES[selectedArchive.month]} {selectedArchive.year}
                    </span>
                  )}
                </p>
                {filteredArticles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sorted by: {SORT_OPTIONS.find(o => o.value === sortBy)?.label} • Page {currentPage} of {totalPages}
                  </p>
                )}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Articles */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : paginatedArticles.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedArticles.map((article, index) => (
                      <Link key={article.id} href={`/blog/${article.slug}`}>
                        <Card className="h-full bg-white border-amber-200 hover:border-amber-400 transition-all cursor-pointer group hover:shadow-lg">
                          {index < 3 && sortBy === "popular" && currentPage === 1 && (
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
                            <CardTitle className="line-clamp-2 text-gray-900 group-hover:text-amber-700 transition-colors text-lg">
                              {article.title}
                            </CardTitle>
                            {article.excerpt && (
                              <CardDescription className="line-clamp-3 mt-2">
                                {cleanExcerpt(article.excerpt)}
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
                            <span className="text-sm text-amber-700 flex items-center gap-1 group-hover:gap-2 transition-all font-medium">
                              Read Full Article <ArrowRight className="w-4 h-4" />
                            </span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedArticles.map((article, index) => (
                      <Link key={article.id} href={`/blog/${article.slug}`}>
                        <Card className="bg-white border-amber-200 hover:border-amber-400 transition-all cursor-pointer group hover:shadow-lg">
                          <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                {index < 3 && sortBy === "popular" && currentPage === 1 && (
                                  <Badge className="bg-primary text-primary-foreground mr-2">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Top {index + 1}
                                  </Badge>
                                )}
                                {article.publishedAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(article.publishedAt), "MMM d, yyyy")}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {(article.views || 0).toLocaleString()} views
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-2">
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {cleanExcerpt(article.excerpt)}
                                </p>
                              )}
                              {article.keywords && (article.keywords as string[]).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {(article.keywords as string[]).slice(0, 5).map((keyword, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0">
                              <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                Read <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        typeof page === 'number' ? (
                          <Button
                            key={index}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={index} className="px-2 text-muted-foreground">
                            {page}
                          </span>
                        )
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-2xl font-bold mb-4">No Articles Found</h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || selectedCategory !== "all" || selectedArchive
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Check back soon for new content!"}
                </p>
                {(searchQuery || selectedCategory !== "all" || selectedArchive) && (
                  <Button onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </main>
          </div>
        </div>
      </div>

      {/* Newsletter CTA */}
      <section className="bg-white py-12">
        <div className="container">
        <Card className="bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-200 py-12 mt-8 bg-amber-50">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="font-bold text-primary">Benjamin Franklin's</h3>
                  <span className="text-xs text-muted-foreground">Top New Brands & Recommendations</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your trusted source for honest product reviews and expert recommendations since 2024. We help you make smarter purchasing decisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {CATEGORIES.slice(1, 5).map(cat => (
                  <li key={cat.value}>
                    <button 
                      onClick={() => { setSelectedCategory(cat.value); setCurrentPage(1); }}
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
                      onClick={() => { setSelectedCategory(cat.value); setCurrentPage(1); }}
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
                <li><Link href="/about"><span className="hover:text-primary transition-colors cursor-pointer">About Us</span></Link></li>
                <li><Link href="/market"><span className="hover:text-primary transition-colors cursor-pointer">NFT Marketplace</span></Link></li>
                <li><a href="/rss.xml" target="_blank" className="hover:text-primary transition-colors flex items-center gap-1">RSS Feed <ExternalLink className="w-3 h-3" /></a></li>
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
