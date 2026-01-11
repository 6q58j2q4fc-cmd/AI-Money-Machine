import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  FileText, 
  Link2, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  DollarSign
} from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">MoneyMachine</span>
          </div>
          <Button 
            onClick={() => window.location.href = getLoginUrl()}
            className="btn-glow"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered Content Monetization
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Turn Trending Topics Into
              <span className="block gradient-text">Profitable Content</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover trending topics, create SEO-optimized articles with AI assistance, 
              and monetize your content with intelligent affiliate link management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={() => window.location.href = getLoginUrl()}
                className="btn-glow text-lg px-8 py-6"
              >
                Start Creating
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-6"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Topics Discovered" },
              { value: "50K+", label: "Articles Generated" },
              { value: "98%", label: "SEO Score Average" },
              { value: "$2M+", label: "Revenue Generated" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                <div className="text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to
              <span className="gradient-text"> Monetize Content</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform for discovering opportunities, creating content, and tracking your revenue.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Trending Topics Discovery",
                description: "AI-powered discovery of trending topics with popularity scores, competition analysis, and keyword suggestions."
              },
              {
                icon: FileText,
                title: "AI Article Generator",
                description: "Generate SEO-optimized articles with intelligent outlines, keyword integration, and readability optimization."
              },
              {
                icon: Link2,
                title: "Affiliate Link Management",
                description: "Organize your affiliate links, auto-suggest placements, and track performance across all your content."
              },
              {
                icon: BarChart3,
                title: "Performance Analytics",
                description: "Track views, clicks, conversions, and estimated revenue with detailed charts and insights."
              },
              {
                icon: Target,
                title: "SEO Optimization",
                description: "Real-time SEO scoring, meta tag optimization, and actionable recommendations for better rankings."
              },
              {
                icon: Zap,
                title: "Publishing Workflow",
                description: "Streamlined workflow from draft to published with review stages and optimization checks."
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="card-glow p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-card">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start
            <span className="gradient-text"> Making Money?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of content creators who are already using MoneyMachine 
            to discover trends, create content, and generate revenue.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = getLoginUrl()}
            className="btn-glow text-lg px-8 py-6"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>© 2025 MoneyMachine. Built for content creators.</p>
        </div>
      </footer>
    </div>
  );
}
