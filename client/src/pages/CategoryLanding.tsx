import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { 
  Loader2, ArrowRight, Star, TrendingUp, Users, Award, 
  Cpu, DollarSign, Heart, ChevronRight, ExternalLink,
  BookOpen, Shield, Zap, Target, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating, TrustBadges, TestimonialCard } from "@/components/SocialProof";
import { getAuthorForArticle, authors as AUTHORS, type Author } from "@shared/authors";
import { format } from "date-fns";

// Category configuration
const categoryConfig: Record<string, {
  title: string;
  description: string;
  longDescription: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  heroImage: string;
  features: { icon: React.ElementType; title: string; description: string }[];
  topProducts: { name: string; description: string; rating: number; url: string }[];
  testimonials: { author: string; role: string; content: string; rating: number }[];
  subcategories: string[];
  expertAuthors: string[];
}> = {
  technology: {
    title: "Technology",
    description: "Expert reviews and recommendations for software, gadgets, cybersecurity, and digital tools",
    longDescription: "Stay ahead of the curve with our comprehensive technology reviews. Our expert team tests and evaluates the latest software, hardware, and digital services to help you make informed decisions. From VPNs and antivirus software to productivity tools and smart devices, we cover everything tech.",
    icon: Cpu,
    color: "text-blue-600",
    gradient: "from-blue-600 to-cyan-500",
    heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    features: [
      { icon: Shield, title: "Security First", description: "We prioritize cybersecurity in all our tech recommendations" },
      { icon: Zap, title: "Performance Tested", description: "Every product undergoes rigorous performance benchmarking" },
      { icon: Target, title: "Value Analysis", description: "We compare price-to-performance to find the best deals" },
    ],
    topProducts: [
      { name: "NordVPN", description: "Best overall VPN for privacy and speed", rating: 4.8, url: "#" },
      { name: "Norton 360", description: "Comprehensive antivirus protection", rating: 4.7, url: "#" },
      { name: "1Password", description: "Secure password management", rating: 4.9, url: "#" },
      { name: "ExpressVPN", description: "Fastest VPN for streaming", rating: 4.6, url: "#" },
    ],
    testimonials: [
      { author: "Alex Thompson", role: "IT Director", content: "The tech reviews here are incredibly thorough. Saved our company thousands in software costs.", rating: 5 },
      { author: "Sarah Chen", role: "Software Engineer", content: "Finally found a reliable source for unbiased tech recommendations. Highly recommended!", rating: 5 },
    ],
    subcategories: ["VPN & Security", "Software", "Gadgets", "AI Tools", "Productivity", "Smart Home"],
    expertAuthors: ["Dr. Sarah Chen", "Marcus Thompson"],
  },
  finance: {
    title: "Finance",
    description: "Smart money management, investing strategies, and financial tools reviewed by experts",
    longDescription: "Take control of your financial future with our expert-curated finance content. We review the best banking apps, investment platforms, tax software, and budgeting tools. Our financial experts break down complex topics into actionable advice to help you grow your wealth.",
    icon: DollarSign,
    color: "text-green-600",
    gradient: "from-green-600 to-emerald-500",
    heroImage: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80",
    features: [
      { icon: TrendingUp, title: "Growth Focused", description: "Strategies to maximize your investment returns" },
      { icon: Shield, title: "Risk Assessment", description: "We evaluate security and reliability of financial tools" },
      { icon: CheckCircle, title: "Compliance Verified", description: "All recommendations meet regulatory standards" },
    ],
    topProducts: [
      { name: "TurboTax", description: "Best tax preparation software", rating: 4.7, url: "#" },
      { name: "Quicken", description: "Comprehensive personal finance management", rating: 4.5, url: "#" },
      { name: "Acorns", description: "Easy micro-investing for beginners", rating: 4.6, url: "#" },
      { name: "Credit Karma", description: "Free credit monitoring and scores", rating: 4.4, url: "#" },
    ],
    testimonials: [
      { author: "Robert Chen", role: "Financial Advisor", content: "I recommend these resources to all my clients. The analysis is spot-on and actionable.", rating: 5 },
      { author: "Lisa Anderson", role: "Small Business Owner", content: "Helped me find the perfect accounting software. My bookkeeping is now a breeze!", rating: 5 },
    ],
    subcategories: ["Investing", "Banking", "Tax Software", "Budgeting", "Crypto", "Insurance"],
    expertAuthors: ["Marcus Thompson", "Jennifer Walsh"],
  },
  health: {
    title: "Health & Wellness",
    description: "Trusted health product reviews, wellness tips, and medical device recommendations",
    longDescription: "Your health is your most valuable asset. Our health and wellness section features expert reviews of medical devices, fitness equipment, supplements, and wellness services. Our team includes healthcare professionals who ensure all recommendations are safe and effective.",
    icon: Heart,
    color: "text-red-600",
    gradient: "from-red-500 to-pink-500",
    heroImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    features: [
      { icon: Award, title: "Expert Reviewed", description: "Healthcare professionals verify all health recommendations" },
      { icon: Shield, title: "Safety First", description: "We prioritize products with proven safety records" },
      { icon: Users, title: "Real Results", description: "User testimonials and clinical evidence inform our reviews" },
    ],
    topProducts: [
      { name: "Medical Guardian", description: "Best medical alert system for seniors", rating: 4.8, url: "#" },
      { name: "Vitacost", description: "Quality supplements at great prices", rating: 4.6, url: "#" },
      { name: "Teladoc", description: "Convenient telehealth services", rating: 4.5, url: "#" },
      { name: "iHerb", description: "Wide selection of natural health products", rating: 4.7, url: "#" },
    ],
    testimonials: [
      { author: "Dr. James Wilson", role: "Family Physician", content: "I trust these reviews when recommending products to my patients. Thorough and accurate.", rating: 5 },
      { author: "Karen Mitchell", role: "Wellness Coach", content: "A go-to resource for evidence-based health product recommendations.", rating: 5 },
    ],
    subcategories: ["Medical Devices", "Supplements", "Fitness", "Telehealth", "Senior Care", "Mental Health"],
    expertAuthors: ["Dr. Emily Rodriguez", "David Park"],
  },
};

export default function CategoryLanding() {
  const { category } = useParams<{ category: string }>();
  const config = categoryConfig[category || ""] || categoryConfig.technology;
  const Icon = config.icon;

  // Fetch articles for this category
  const { data: articlesData, isLoading } = trpc.publicArticles.list.useQuery({
    limit: 100,
  });

  // Filter articles by category
  const allArticles = articlesData || [];
  const articles = allArticles.filter((article: any) => 
    article.category?.toLowerCase() === category?.toLowerCase() ||
    article.keywords?.some((k: string) => k.toLowerCase().includes(category?.toLowerCase() || ''))
  );
  const featuredArticles = articles.slice(0, 3);
  const recentArticles = articles.slice(3, 9);

  // Get expert authors for this category
  const categoryExperts = useMemo(() => {
    return AUTHORS.filter(author => 
      config.expertAuthors.includes(author.name)
    );
  }, [config.expertAuthors]);

  // JSON-LD structured data
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${config.title} - Benjamin Franklin's Recommendations`,
    "description": config.description,
    "url": typeof window !== 'undefined' ? window.location.href : '',
    "isPartOf": {
      "@type": "WebSite",
      "name": "Benjamin Franklin's Top New Brands & Recommendations",
      "url": typeof window !== 'undefined' ? window.location.origin : ''
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": typeof window !== 'undefined' ? window.location.origin : '' },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": typeof window !== 'undefined' ? `${window.location.origin}/blog` : '' },
        { "@type": "ListItem", "position": 3, "name": config.title, "item": typeof window !== 'undefined' ? window.location.href : '' }
      ]
    }
  }), [config]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{config.title} Reviews & Recommendations | Benjamin Franklin's</title>
        <meta name="description" content={config.description} />
        <meta property="og:title" content={`${config.title} Reviews & Recommendations`} />
        <meta property="og:description" content={config.description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={config.heroImage} />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className={`relative bg-gradient-to-r ${config.gradient} text-white overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${config.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container relative py-20 md:py-28">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/80 text-sm mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{config.title}</span>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">{config.title}</h1>
              <p className="text-xl text-white/90 mt-2">{config.description}</p>
            </div>
          </div>

          <p className="text-lg text-white/80 max-w-3xl mb-8">
            {config.longDescription}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">{articles.length}+ Articles</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">Expert Reviewed</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Updated Daily</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-gray-50 py-6 border-b">
        <div className="container">
          <div className="flex justify-center">
            <TrustBadges badges={["expert", "verified", "secure", "bestseller"]} />
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {config.features.map((feature, i) => {
              const FeatureIcon = feature.icon;
              return (
                <Card key={i} className="border-gray-200 hover:border-gray-300 transition-colors">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shrink-0`}>
                      <FeatureIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Products */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Top Rated {config.title} Products</h2>
              <p className="text-gray-600 mt-1">Our experts' top picks based on extensive testing</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {config.topProducts.map((product, i) => (
              <Card key={i} className="border-gray-200 hover:shadow-lg transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`bg-gradient-to-r ${config.gradient} text-white`}>
                      #{i + 1} Pick
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <StarRating rating={product.rating} size="sm" />
                    <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">
                      View <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured {config.title} Articles</h2>
                <p className="text-gray-600 mt-1">In-depth reviews and buying guides</p>
              </div>
              <Link href={`/blog?category=${category}`}>
                <Button variant="outline">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {featuredArticles.map((article: any) => {
                const author = getAuthorForArticle(article.keywords || [article.category]);
                return (
                  <Link key={article.id} href={`/article/${article.slug}`}>
                    <Card className="h-full border-gray-200 hover:shadow-xl transition-all group cursor-pointer overflow-hidden">
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <img 
                          src={`https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80`}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className={`bg-gradient-to-r ${config.gradient} text-white`}>
                            Featured
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                          {article.metaDescription || article.title}
                        </p>
                        <div className="flex items-center gap-3">
                          <img 
                            src={author.avatar} 
                            alt={author.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{author.name}</p>
                            <p className="text-gray-500">{format(new Date(article.createdAt), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Subcategories */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse {config.title} Topics</h2>
          <div className="flex flex-wrap gap-3">
            {config.subcategories.map((sub, i) => (
              <Link key={i} href={`/blog?search=${encodeURIComponent(sub)}`}>
                <Badge 
                  variant="outline" 
                  className="px-4 py-2 text-base cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {sub}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Expert Authors */}
      {categoryExperts.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meet Our {config.title} Experts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {categoryExperts.map((expert: Author) => (
                <Card key={expert.name} className="border-gray-200">
                  <CardContent className="p-6 flex items-start gap-4">
                    <img 
                      src={expert.avatar}
                      alt={expert.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{expert.name}</h3>
                      <p className={`text-sm ${config.color} font-medium mb-2`}>{expert.title}</p>
                      <p className="text-sm text-gray-600 mb-3">{expert.bio}</p>
                      <div className="flex flex-wrap gap-2">
                        {expert.credentials.slice(0, 2).map((cred: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {cred}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What Readers Say</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {config.testimonials.map((testimonial, i) => (
              <TestimonialCard 
                key={i}
                testimonial={{
                  id: `t-${i}`,
                  ...testimonial
                }}
                variant="featured"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Latest {config.title} Reviews</h2>
              <Link href={`/blog?category=${category}`}>
                <Button variant="ghost">
                  See More <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentArticles.map((article: any) => (
                <Link key={article.id} href={`/article/${article.slug}`}>
                  <Card className="h-full border-gray-200 hover:shadow-lg transition-shadow group cursor-pointer">
                    <CardContent className="p-5">
                      <Badge variant="outline" className="mb-3">
                        {article.category || config.title}
                      </Badge>
                      <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(article.createdAt), 'MMM d, yyyy')}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className={`py-16 bg-gradient-to-r ${config.gradient} text-white`}>
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make Smarter {config.title} Choices?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Browse our complete collection of expert reviews and find the perfect products for your needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={`/blog?category=${category}`}>
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                Browse All {config.title} Articles
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/blog">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Explore All Categories
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <p className="font-bold text-lg">Benjamin Franklin's</p>
                <p className="text-sm text-gray-400">Top New Brands & Recommendations</p>
              </div>
            </div>
            <div className="flex gap-6">
              <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">All Articles</Link>
              <Link href="/blog/category/technology" className="text-gray-400 hover:text-white transition-colors">Technology</Link>
              <Link href="/blog/category/finance" className="text-gray-400 hover:text-white transition-colors">Finance</Link>
              <Link href="/blog/category/health" className="text-gray-400 hover:text-white transition-colors">Health</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Benjamin Franklin's Top New Brands & Recommendations. All rights reserved.</p>
            <p className="mt-2 text-xs">
              Affiliate Disclosure: Some links on this site are affiliate links. We may earn a commission at no extra cost to you.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
