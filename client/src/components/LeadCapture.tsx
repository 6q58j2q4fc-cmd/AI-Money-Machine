import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mail, Gift, Clock, TrendingUp, Star, ExternalLink, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface LeadCaptureProps {
  articleTitle?: string;
  category?: string;
  affiliateLinks?: Array<{ link?: { name?: string; url?: string; category?: string } }>;
}

// Exit Intent Popup
export function ExitIntentPopup({ articleTitle, category, affiliateLinks }: LeadCaptureProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    // Check if already dismissed this session
    const wasDismissed = sessionStorage.getItem('exit-popup-dismissed');
    if (wasDismissed) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !triggered.current && !dismissed) {
        triggered.current = true;
        setIsVisible(true);
      }
    };

    // Also trigger on mobile after 30 seconds of reading
    const timer = setTimeout(() => {
      if (!triggered.current && !dismissed) {
        triggered.current = true;
        setIsVisible(true);
      }
    }, 30000);

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    sessionStorage.setItem('exit-popup-dismissed', 'true');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("🎉 You're in! Check your inbox for exclusive deals.");
      handleDismiss();
    }
  };

  const topLink = affiliateLinks?.[0];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Amber gradient header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-8 h-8" />
            <div>
              <p className="text-sm font-medium opacity-90">Wait! Before you go...</p>
              <h3 className="text-xl font-bold">Get Exclusive Deals</h3>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-2">
            Join 47,000+ readers who save money on the products they love.
          </p>
        </div>

        <div className="p-6">
          {/* Social proof */}
          <div className="flex items-center gap-2 mb-4">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-sm text-gray-600 font-medium">4.9/5 from 2,847 subscribers</span>
          </div>

          {/* Benefits */}
          <ul className="space-y-2 mb-5">
            {[
              "Exclusive discount codes (avg. 40% off)",
              "Early access to flash sales",
              "Expert product reviews & comparisons",
              "Weekly money-saving tips"
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">✓</span>
                {benefit}
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Enter your best email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-amber-200 focus:border-amber-400"
              required
            />
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3">
              <Mail className="w-4 h-4 mr-2" />
              Yes! Send Me Exclusive Deals
            </Button>
          </form>

          <button
            onClick={handleDismiss}
            className="w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-600"
          >
            No thanks, I'll pay full price
          </button>
        </div>
      </div>
    </div>
  );
}

// Scroll-triggered sticky CTA bar
export function ScrollAffiliateCTA({ affiliateLinks, category }: LeadCaptureProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 25 && !isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const topLink = affiliateLinks?.[0];
  if (!isVisible || !topLink?.link?.url || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-2xl">
        <div className="container max-w-6xl py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">
                🔥 Limited Deal: {topLink.link.name}
              </p>
              <p className="text-xs opacity-80 hidden sm:block">
                Recommended by Benjamin Franklin's experts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={topLink.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold text-sm px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Get Deal <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white/70 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline scroll-triggered content upgrade box
export function ContentUpgradeBox({ articleTitle, category }: LeadCaptureProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (boxRef.current) observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      toast.success("✅ Check your inbox for the free guide!");
    }
  };

  const categoryGuides: Record<string, { title: string; bullets: string[] }> = {
    health: {
      title: "Free: Top 10 Health Products Guide",
      bullets: ["Best-rated medical devices", "Expert-reviewed supplements", "Money-saving health tips"]
    },
    finance: {
      title: "Free: Ultimate Money-Saving Cheat Sheet",
      bullets: ["Best cashback credit cards", "Tax-saving strategies", "Investment shortcuts"]
    },
    technology: {
      title: "Free: Tech Buyer's Guide 2025",
      bullets: ["Best deals on software", "Security essentials", "Productivity tools"]
    },
    travel: {
      title: "Free: Travel Deals Insider Guide",
      bullets: ["Cheapest booking times", "Hotel upgrade secrets", "Flight deal alerts"]
    },
    default: {
      title: "Free: Benjamin Franklin's Money Guide",
      bullets: ["Top product recommendations", "Exclusive discount codes", "Expert buying tips"]
    }
  };

  const guide = categoryGuides[category || 'default'] || categoryGuides.default;

  return (
    <div
      ref={boxRef}
      className={`my-8 rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3">
        <div className="flex items-center gap-2 text-white">
          <Gift className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-wide">Free Download</span>
        </div>
      </div>
      <div className="p-6">
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎉</div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Check Your Inbox!</h4>
            <p className="text-gray-600 text-sm">Your free guide is on its way.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3">{guide.title}</h4>
              <ul className="space-y-2">
                {guide.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 font-bold">✓</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-amber-300 focus:border-amber-500 bg-white"
                required
              />
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold">
                <Mail className="w-4 h-4 mr-2" />
                Send Me the Free Guide
              </Button>
              <p className="text-xs text-gray-500 text-center">No spam. Unsubscribe anytime.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Countdown urgency timer for affiliate deals
export function DealCountdown({ linkName, linkUrl, onLinkClick }: { linkName?: string; linkUrl?: string; onLinkClick?: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 47, seconds: 33 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!linkUrl) return null;

  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 my-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-red-500" />
        <span className="font-bold text-red-700 text-sm uppercase tracking-wide">Limited Time Deal</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        {[
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Min', value: timeLeft.minutes },
          { label: 'Sec', value: timeLeft.seconds },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="bg-red-600 text-white font-mono font-bold text-xl w-12 h-12 rounded-lg flex items-center justify-center">
              {String(value).padStart(2, '0')}
            </div>
            <p className="text-xs text-red-600 mt-1">{label}</p>
          </div>
        ))}
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">{linkName}</p>
          <p className="text-xs text-gray-600">Deal expires soon!</p>
        </div>
      </div>
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onLinkClick}
        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
      >
        Claim This Deal Before It Expires →
      </a>
    </div>
  );
}
