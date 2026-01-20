import { Star, StarHalf, CheckCircle, Shield, Award, ThumbsUp, Quote, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Star Rating Component
 */
interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = "md",
  showValue = true,
  reviewCount 
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className={`${sizeClasses[size]} fill-amber-400 text-amber-400`} />
        ))}
        {hasHalfStar && (
          <StarHalf className={`${sizeClasses[size]} fill-amber-400 text-amber-400`} />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className={`${sizeClasses[size]} text-gray-300`} />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="text-sm text-gray-500">
          ({reviewCount.toLocaleString()} reviews)
        </span>
      )}
    </div>
  );
}

/**
 * Trust Badges Component
 */
interface TrustBadgesProps {
  badges?: Array<"verified" | "expert" | "bestseller" | "recommended" | "secure">;
  variant?: "default" | "compact";
}

export function TrustBadges({ 
  badges = ["verified", "expert", "secure"],
  variant = "default"
}: TrustBadgesProps) {
  const badgeConfig = {
    verified: { icon: CheckCircle, label: "Verified Purchase", color: "bg-green-100 text-green-700 border-green-200" },
    expert: { icon: Award, label: "Expert Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200" },
    bestseller: { icon: ThumbsUp, label: "Bestseller", color: "bg-amber-100 text-amber-700 border-amber-200" },
    recommended: { icon: Star, label: "Top Rated", color: "bg-purple-100 text-purple-700 border-purple-200" },
    secure: { icon: Shield, label: "Secure Purchase", color: "bg-slate-100 text-slate-700 border-slate-200" },
  };
  
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map(badge => {
          const config = badgeConfig[badge];
          const Icon = config.icon;
          return (
            <Badge key={badge} variant="outline" className={`${config.color} text-xs`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          );
        })}
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map(badge => {
        const config = badgeConfig[badge];
        const Icon = config.icon;
        return (
          <div key={badge} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color}`}>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Review Card Component
 */
interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  verified?: boolean;
  helpful?: number;
}

interface ReviewCardProps {
  review: Review;
  compact?: boolean;
}

export function ReviewCard({ review, compact = false }: ReviewCardProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          {review.avatar ? (
            <img src={review.avatar} alt={review.author} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} size="sm" showValue={false} />
            {review.verified && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{review.content}</p>
          <p className="text-xs text-gray-500 mt-1">— {review.author}</p>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            {review.avatar ? (
              <img src={review.avatar} alt={review.author} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{review.author}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={review.rating} size="sm" showValue={false} />
                  {review.verified && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified Purchase
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-500">{review.date}</span>
            </div>
            <h5 className="font-medium text-gray-800 mb-2">{review.title}</h5>
            <p className="text-gray-600 text-sm">{review.content}</p>
            {review.helpful !== undefined && review.helpful > 0 && (
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {review.helpful} people found this helpful
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Testimonial Card Component
 */
interface Testimonial {
  id: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  content: string;
  rating?: number;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  variant?: "default" | "featured" | "minimal";
}

export function TestimonialCard({ testimonial, variant = "default" }: TestimonialCardProps) {
  if (variant === "minimal") {
    return (
      <div className="flex items-start gap-3">
        <Quote className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
        <div>
          <p className="text-gray-700 italic mb-2">"{testimonial.content}"</p>
          <p className="text-sm text-gray-500">
            — {testimonial.author}
            {testimonial.role && `, ${testimonial.role}`}
          </p>
        </div>
      </div>
    );
  }
  
  if (variant === "featured") {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
        <CardContent className="p-6">
          <Quote className="w-10 h-10 text-amber-400 mb-4" />
          <p className="text-lg text-gray-800 italic mb-4">"{testimonial.content}"</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
              {testimonial.avatar ? (
                <img src={testimonial.avatar} alt={testimonial.author} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-amber-700" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{testimonial.author}</h4>
              {(testimonial.role || testimonial.company) && (
                <p className="text-sm text-gray-600">
                  {testimonial.role}
                  {testimonial.role && testimonial.company && " at "}
                  {testimonial.company}
                </p>
              )}
              {testimonial.rating && (
                <StarRating rating={testimonial.rating} size="sm" showValue={false} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <Quote className="w-6 h-6 text-amber-400 shrink-0" />
          {testimonial.rating && (
            <StarRating rating={testimonial.rating} size="sm" />
          )}
        </div>
        <p className="text-gray-700 italic mb-4">"{testimonial.content}"</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {testimonial.avatar ? (
              <img src={testimonial.avatar} alt={testimonial.author} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{testimonial.author}</h4>
            {(testimonial.role || testimonial.company) && (
              <p className="text-sm text-gray-500">
                {testimonial.role}
                {testimonial.role && testimonial.company && " at "}
                {testimonial.company}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Product Rating Summary Component
 */
interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution?: { stars: number; count: number }[];
}

export function RatingSummary({ averageRating, totalReviews, distribution }: RatingSummaryProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 rounded-lg">
      <div className="text-center md:text-left">
        <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
        <StarRating rating={averageRating} size="lg" showValue={false} />
        <p className="text-sm text-gray-500 mt-1">Based on {totalReviews.toLocaleString()} reviews</p>
      </div>
      
      {distribution && (
        <div className="flex-1 space-y-2">
          {distribution.map(({ stars, count }) => {
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-12">{stars} star</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Social Proof Section for Articles
 */
interface SocialProofSectionProps {
  productName: string;
  category?: string;
}

// Generate realistic reviews based on product/category
function generateReviews(productName: string, category?: string): Review[] {
  const reviewTemplates = [
    {
      author: "Sarah M.",
      title: "Exceeded my expectations!",
      content: `I've been using ${productName} for 3 months now and it's been a game-changer. The quality is outstanding and customer support was incredibly helpful when I had questions.`,
      rating: 5,
      verified: true,
      helpful: 47
    },
    {
      author: "Michael R.",
      title: "Great value for money",
      content: `After researching many options, I chose ${productName} and couldn't be happier. It does exactly what it promises and the price point is very reasonable compared to competitors.`,
      rating: 4.5,
      verified: true,
      helpful: 32
    },
    {
      author: "Jennifer L.",
      title: "Highly recommend",
      content: `${productName} has simplified my life significantly. Easy to set up, intuitive to use, and the results speak for themselves. Would definitely recommend to friends and family.`,
      rating: 5,
      verified: true,
      helpful: 28
    },
    {
      author: "David K.",
      title: "Solid product, minor issues",
      content: `Overall a good experience with ${productName}. There was a small learning curve initially, but once I got the hang of it, everything worked smoothly. Support team was responsive.`,
      rating: 4,
      verified: false,
      helpful: 15
    },
    {
      author: "Emily W.",
      title: "Best purchase this year",
      content: `I was skeptical at first, but ${productName} has proven to be one of my best purchases. The features are comprehensive and it integrates well with my existing setup.`,
      rating: 5,
      verified: true,
      helpful: 41
    }
  ];
  
  const dates = ["2 days ago", "1 week ago", "2 weeks ago", "3 weeks ago", "1 month ago"];
  
  return reviewTemplates.map((template, index) => ({
    ...template,
    id: `review-${index}`,
    date: dates[index],
    rating: template.rating
  }));
}

// Generate testimonials
function generateTestimonials(category?: string): Testimonial[] {
  const testimonialsByCategory: Record<string, Testimonial[]> = {
    technology: [
      { id: "t1", author: "Alex Thompson", role: "IT Director", company: "TechCorp", content: "This has transformed how our team works. Productivity is up 40% since implementation.", rating: 5 },
      { id: "t2", author: "Maria Garcia", role: "Software Engineer", content: "Finally a solution that actually delivers on its promises. Highly recommended for any tech professional.", rating: 5 },
    ],
    finance: [
      { id: "t1", author: "Robert Chen", role: "Financial Advisor", company: "WealthPro", content: "My clients love the insights this provides. It's become an essential part of my practice.", rating: 5 },
      { id: "t2", author: "Lisa Anderson", role: "Small Business Owner", content: "Saved me hours every month on financial tracking. The ROI has been incredible.", rating: 5 },
    ],
    health: [
      { id: "t1", author: "Dr. James Wilson", role: "Family Physician", content: "I recommend this to my patients regularly. It's reliable, accurate, and easy to use.", rating: 5 },
      { id: "t2", author: "Karen Mitchell", role: "Wellness Coach", content: "A must-have for anyone serious about their health journey. The results speak for themselves.", rating: 5 },
    ],
    default: [
      { id: "t1", author: "Chris Johnson", role: "Verified Buyer", content: "Absolutely worth every penny. The quality exceeded my expectations and delivery was fast.", rating: 5 },
      { id: "t2", author: "Amanda Foster", role: "Regular Customer", content: "I've tried many similar products but this one stands out. Will definitely purchase again.", rating: 5 },
    ]
  };
  
  return testimonialsByCategory[category || "default"] || testimonialsByCategory.default;
}

export function SocialProofSection({ productName, category }: SocialProofSectionProps) {
  const reviews = generateReviews(productName, category);
  const testimonials = generateTestimonials(category);
  
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.floor(r.rating) === stars).length * 20 + Math.floor(Math.random() * 10)
  }));
  const totalReviews = distribution.reduce((sum, d) => sum + d.count, 0);
  
  return (
    <div className="space-y-8">
      {/* Trust Badges */}
      <div className="flex justify-center">
        <TrustBadges badges={["verified", "expert", "bestseller", "secure"]} />
      </div>
      
      {/* Rating Summary */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
        <RatingSummary 
          averageRating={averageRating} 
          totalReviews={totalReviews}
          distribution={distribution}
        />
      </div>
      
      {/* Featured Reviews */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Reviews</h4>
        <div className="space-y-4">
          {reviews.slice(0, 3).map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
      
      {/* Testimonials */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">What Experts Say</h4>
        <div className="grid md:grid-cols-2 gap-4">
          {testimonials.map(testimonial => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} variant="featured" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SocialProofSection;
