import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  DollarSign,
  Link2,
  FileText,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  Lightbulb,
  Target,
  BarChart3
} from "lucide-react";

const affiliatePrograms = [
  {
    name: "Amazon Associates",
    description: "The world's largest affiliate program with millions of products",
    commission: "1-10%",
    payout: "$10 minimum",
    link: "https://affiliate-program.amazon.com",
    categories: ["General", "Electronics", "Books", "Home"]
  },
  {
    name: "ShareASale",
    description: "Large network with thousands of merchants across all niches",
    commission: "Varies by merchant",
    payout: "$50 minimum",
    link: "https://www.shareasale.com",
    categories: ["Fashion", "Home", "Tech", "Finance"]
  },
  {
    name: "Commission Junction (CJ)",
    description: "Premium affiliate network with major brands",
    commission: "Varies by merchant",
    payout: "$50 minimum",
    link: "https://www.cj.com",
    categories: ["Retail", "Travel", "Finance", "Services"]
  },
  {
    name: "ClickBank",
    description: "Digital products marketplace with high commissions",
    commission: "50-75%",
    payout: "$10 minimum",
    link: "https://www.clickbank.com",
    categories: ["Digital Products", "E-learning", "Software"]
  },
  {
    name: "Rakuten Advertising",
    description: "Global affiliate network with premium brands",
    commission: "Varies by merchant",
    payout: "$50 minimum",
    link: "https://rakutenadvertising.com",
    categories: ["Retail", "Fashion", "Electronics"]
  },
  {
    name: "Impact",
    description: "Modern partnership platform with top brands",
    commission: "Varies by merchant",
    payout: "$25 minimum",
    link: "https://impact.com",
    categories: ["SaaS", "Finance", "Travel", "Retail"]
  }
];

const adNetworks = [
  {
    name: "Google AdSense",
    description: "The most popular ad network for publishers",
    requirements: "Quality content, compliant site",
    payout: "$100 minimum",
    link: "https://www.google.com/adsense"
  },
  {
    name: "Mediavine",
    description: "Premium ad management for lifestyle publishers",
    requirements: "50,000 sessions/month minimum",
    payout: "$25 minimum",
    link: "https://www.mediavine.com"
  },
  {
    name: "AdThrive",
    description: "High-paying ad network for established publishers",
    requirements: "100,000 pageviews/month minimum",
    payout: "$25 minimum",
    link: "https://www.adthrive.com"
  },
  {
    name: "Ezoic",
    description: "AI-powered ad optimization platform",
    requirements: "10,000 pageviews/month minimum",
    payout: "$20 minimum",
    link: "https://www.ezoic.com"
  }
];

const bestPractices = [
  {
    title: "Choose the Right Niche",
    description: "Focus on niches with high commercial intent and good affiliate programs. Finance, technology, health, and lifestyle tend to perform well.",
    icon: Target
  },
  {
    title: "Create Quality Content",
    description: "Write comprehensive, helpful content that genuinely helps readers. Search engines and readers reward quality over quantity.",
    icon: FileText
  },
  {
    title: "Optimize for SEO",
    description: "Use our SEO tools to optimize every article. Target long-tail keywords with buyer intent for better conversion rates.",
    icon: TrendingUp
  },
  {
    title: "Strategic Link Placement",
    description: "Place affiliate links naturally within your content. Use our AI suggestions to find the best placement opportunities.",
    icon: Link2
  },
  {
    title: "Track and Analyze",
    description: "Monitor your analytics regularly. Identify top-performing content and double down on what works.",
    icon: BarChart3
  },
  {
    title: "Disclose Affiliate Relationships",
    description: "Always disclose affiliate relationships to comply with FTC guidelines and build trust with your audience.",
    icon: CheckCircle
  }
];

export default function MonetizationGuide() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Monetization Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to monetize your content effectively
          </p>
        </div>

        {/* Quick Start */}
        <Card className="card-glow border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>
              Follow these steps to start earning from your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: 1, title: "Discover Topics", desc: "Find trending topics with monetization potential" },
                { step: 2, title: "Create Content", desc: "Generate SEO-optimized articles with AI" },
                { step: 3, title: "Add Affiliate Links", desc: "Insert relevant affiliate links in your content" },
                { step: 4, title: "Publish & Track", desc: "Publish and monitor performance analytics" },
              ].map((item) => (
                <div key={item.step} className="text-center p-4 rounded-lg bg-secondary/50">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 font-bold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Best Practices
            </CardTitle>
            <CardDescription>
              Follow these guidelines to maximize your earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bestPractices.map((practice, i) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <practice.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{practice.title}</h3>
                  <p className="text-sm text-muted-foreground">{practice.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Programs */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Recommended Affiliate Programs
            </CardTitle>
            <CardDescription>
              Sign up for these programs to get affiliate links for your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {affiliatePrograms.map((program, i) => (
                <AccordionItem key={i} value={`program-${i}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{program.name}</span>
                      <Badge variant="outline" className="text-primary">
                        {program.commission}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-muted-foreground">{program.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Commission:</span>
                          <span className="ml-2 font-medium">{program.commission}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payout:</span>
                          <span className="ml-2 font-medium">{program.payout}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {program.categories.map((cat, j) => (
                          <Badge key={j} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                      <a 
                        href={program.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        Sign up at {program.name}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Ad Networks */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Ad Networks
            </CardTitle>
            <CardDescription>
              Display ads on your content for passive income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {adNetworks.map((network, i) => (
                <AccordionItem key={i} value={`network-${i}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{network.name}</span>
                      <Badge variant="outline">{network.payout}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-muted-foreground">{network.description}</p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Requirements:</span>
                        <span className="ml-2 font-medium">{network.requirements}</span>
                      </div>
                      <a 
                        href={network.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        Apply at {network.name}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <Card className="card-glow bg-secondary/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Important: FTC Disclosure Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  The Federal Trade Commission (FTC) requires that you clearly disclose any material connections 
                  between you and the products or services you recommend. Always include a clear disclosure 
                  statement on pages containing affiliate links, such as: "This post contains affiliate links. 
                  If you make a purchase through these links, I may earn a commission at no additional cost to you."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
