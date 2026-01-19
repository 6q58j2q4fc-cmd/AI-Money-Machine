import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Shield, 
  Award, 
  Users, 
  Target, 
  CheckCircle2, 
  Star,
  BookOpen,
  TrendingUp,
  Heart,
  Mail,
  ExternalLink
} from "lucide-react";

// Editorial team members
const editorialTeam = [
  {
    name: "Benjamin Franklin III",
    role: "Founder & Editor-in-Chief",
    bio: "A passionate advocate for consumer education with over 15 years of experience in product research and review journalism. Benjamin founded this publication to help everyday consumers make informed purchasing decisions.",
    expertise: ["Consumer Electronics", "Financial Products", "Home & Garden"],
    image: "👨‍💼"
  },
  {
    name: "Sarah Mitchell",
    role: "Senior Product Analyst",
    bio: "Former product manager at a Fortune 500 tech company, Sarah brings deep industry knowledge to our technology and productivity tool reviews. She holds certifications in product management and UX research.",
    expertise: ["Technology", "Productivity Tools", "Software"],
    image: "👩‍💻"
  },
  {
    name: "Dr. Michael Chen",
    role: "Health & Wellness Editor",
    bio: "Board-certified nutritionist with a Ph.D. in Nutritional Sciences. Dr. Chen ensures all health-related content meets rigorous scientific standards and provides evidence-based recommendations.",
    expertise: ["Nutrition", "Supplements", "Fitness Equipment"],
    image: "👨‍⚕️"
  },
  {
    name: "Emily Rodriguez",
    role: "Finance & Investing Specialist",
    bio: "Certified Financial Planner (CFP) with experience at leading investment firms. Emily specializes in making complex financial products accessible to everyday consumers.",
    expertise: ["Personal Finance", "Investing", "Insurance"],
    image: "👩‍💼"
  },
  {
    name: "James Thompson",
    role: "Home & Lifestyle Editor",
    bio: "Interior designer and sustainability consultant who has contributed to major home improvement publications. James focuses on eco-friendly and practical home solutions.",
    expertise: ["Home Improvement", "Sustainable Living", "Pet Products"],
    image: "👨‍🎨"
  },
  {
    name: "Lisa Park",
    role: "Research Director",
    bio: "Data scientist with expertise in consumer behavior analysis. Lisa leads our research methodology development and ensures all product rankings are based on verifiable data.",
    expertise: ["Data Analysis", "Market Research", "Consumer Trends"],
    image: "👩‍🔬"
  }
];

// Review methodology steps
const reviewMethodology = [
  {
    step: 1,
    title: "Product Research",
    description: "We identify products through market analysis, reader requests, and trending searches. Our team researches manufacturer claims, specifications, and market positioning."
  },
  {
    step: 2,
    title: "Hands-On Testing",
    description: "When possible, we acquire products for hands-on evaluation. Our experts test real-world performance, durability, and user experience over extended periods."
  },
  {
    step: 3,
    title: "Data Aggregation",
    description: "We compile data from verified customer reviews, expert opinions, and third-party testing labs to build a comprehensive performance profile."
  },
  {
    step: 4,
    title: "Comparative Analysis",
    description: "Products are compared against competitors in the same category using standardized criteria including value, features, reliability, and customer satisfaction."
  },
  {
    step: 5,
    title: "Expert Review",
    description: "Our category specialists review all findings and provide their professional assessment based on years of industry experience."
  },
  {
    step: 6,
    title: "Editorial Approval",
    description: "All content undergoes editorial review for accuracy, clarity, and compliance with our editorial guidelines before publication."
  }
];

// Trust indicators
const trustIndicators = [
  { icon: BookOpen, label: "1,400+ Reviews", description: "Comprehensive product guides" },
  { icon: Users, label: "500K+ Readers", description: "Monthly visitors trust our recommendations" },
  { icon: Award, label: "Since 2024", description: "Established track record" },
  { icon: CheckCircle2, label: "100% Independent", description: "No sponsored rankings" }
];

export default function AboutUs() {
  useEffect(() => {
    document.title = "About Us | Benjamin Franklin's Top New Brands & Recommendations";
    
    // Add meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn about Benjamin Franklin\'s Top New Brands & Recommendations - our editorial team, review methodology, and commitment to honest, independent product reviews.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <Link href="/blog">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">💰</span>
              <div>
                <span className="font-bold text-primary">Benjamin Franklin's</span>
                <span className="text-xs text-muted-foreground block">Top New Brands & Recommendations</span>
              </div>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Articles
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">About Us</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Honest Reviews You Can <span className="text-primary">Trust</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Benjamin Franklin's Top New Brands & Recommendations is your trusted source for 
              independent product reviews and buying guides. We help millions of consumers make 
              smarter purchasing decisions every month.
            </p>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {trustIndicators.map((indicator, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <indicator.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-bold">{indicator.label}</p>
                  <p className="text-xs text-muted-foreground">{indicator.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 border-b border-border">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                In an age of sponsored content and paid reviews, we believe consumers deserve 
                access to honest, unbiased product information. Our mission is to cut through 
                the noise and provide clear, actionable recommendations.
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                Every product we recommend has been thoroughly researched by our expert team. 
                We never accept payment for positive reviews, and our rankings are based solely 
                on product merit.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Independent Research</Badge>
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Expert Analysis</Badge>
                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Consumer First</Badge>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
              <blockquote className="text-xl italic text-foreground/80">
                "An investment in knowledge pays the best interest."
              </blockquote>
              <p className="mt-4 text-primary font-semibold">— Benjamin Franklin</p>
              <p className="text-sm text-muted-foreground mt-2">
                Our namesake's wisdom guides our approach: we believe informed consumers 
                make better decisions. That's why we invest heavily in research and education.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Team Section */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Meet Our Editorial Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our team of industry experts, certified professionals, and experienced journalists 
              work together to bring you the most accurate and helpful product recommendations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editorialTeam.map((member, i) => (
              <Card key={i} className="bg-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{member.image}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{member.name}</h3>
                      <p className="text-primary text-sm font-medium">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mt-4">{member.bio}</p>
                  <div className="flex flex-wrap gap-1 mt-4">
                    {member.expertise.map((exp, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{exp}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Review Methodology Section */}
      <section className="py-16 border-b border-border">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Our Review Methodology
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every product recommendation follows our rigorous 6-step review process, 
              ensuring accuracy, fairness, and real-world relevance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewMethodology.map((step, i) => (
              <div key={i} className="relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <h3 className="font-bold text-lg mb-2 mt-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Guidelines Section */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Editorial Guidelines
            </h2>
            
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Independence & Integrity
                </h3>
                <p className="text-muted-foreground">
                  Our editorial team operates independently from our business team. Product rankings 
                  are never influenced by advertising relationships or affiliate partnerships. We 
                  recommend products based solely on their merit and value to consumers.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Transparency
                </h3>
                <p className="text-muted-foreground">
                  We clearly disclose when articles contain affiliate links. When you purchase 
                  through our links, we may earn a commission at no extra cost to you. This 
                  supports our ability to provide free, high-quality content.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Accuracy & Updates
                </h3>
                <p className="text-muted-foreground">
                  We regularly update our content to reflect new products, price changes, and 
                  updated specifications. If you notice any inaccuracies, please contact us 
                  and we'll investigate promptly.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Expert Qualifications
                </h3>
                <p className="text-muted-foreground">
                  All content is written or reviewed by subject matter experts with relevant 
                  credentials and experience. We verify the qualifications of all contributors 
                  and clearly attribute content to its authors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Disclosure Section */}
      <section className="py-16 border-b border-border">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Affiliate Disclosure
            </h2>
            <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-lg mb-4">
                Benjamin Franklin's Top New Brands & Recommendations participates in various 
                affiliate marketing programs, including Commission Junction (CJ Affiliate) and 
                other networks.
              </p>
              <p className="text-muted-foreground mb-4">
                This means we may earn a commission when you click on links and make purchases 
                through our site. These commissions help us maintain our editorial independence 
                and continue providing free, high-quality content.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> Our affiliate relationships never influence our 
                product rankings or recommendations. We recommend products we genuinely believe 
                offer value to our readers, regardless of affiliate status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-3">
              <Mail className="w-8 h-8 text-primary" />
              Get In Touch
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Have questions, feedback, or suggestions? We'd love to hear from you. 
              Our editorial team reads every message.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-glow">
                <Mail className="w-5 h-5 mr-2" />
                Contact Editorial Team
              </Button>
              <Link href="/blog">
                <Button size="lg" variant="outline">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Browse Our Reviews
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-xl font-bold text-primary">Benjamin Franklin's</p>
                  <p className="text-sm text-muted-foreground">Top New Brands & Recommendations</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Your trusted source for honest product reviews since 2024.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/blog">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Articles
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Benjamin Franklin's Top New Brands & Recommendations. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
