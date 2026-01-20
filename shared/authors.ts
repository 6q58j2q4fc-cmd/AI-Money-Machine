// Author profiles for E-E-A-T signals
// Each author has expertise in specific categories

export interface Author {
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  credentials: string[];
  avatar: string;
  social?: {
    twitter?: string;
    linkedin?: string;
  };
}

export const authors: Author[] = [
  {
    id: "benjamin-franklin",
    name: "Benjamin Franklin",
    title: "Founder & Editor-in-Chief",
    bio: "A lifelong advocate for financial wisdom and practical knowledge. With over 20 years of experience reviewing products and services, Benjamin brings his famous motto 'An investment in knowledge pays the best interest' to every article.",
    expertise: ["Finance", "Productivity", "Business", "Technology"],
    credentials: [
      "Certified Financial Planner (CFP)",
      "Former Investment Advisor",
      "Published Author on Personal Finance"
    ],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    social: {
      twitter: "https://twitter.com/benjaminfranklinrecs",
      linkedin: "https://linkedin.com/in/benjaminfranklinrecs"
    }
  },
  {
    id: "sarah-chen",
    name: "Dr. Sarah Chen",
    title: "Health & Wellness Editor",
    bio: "Board-certified physician with a passion for preventive medicine and health technology. Dr. Chen reviews medical devices, fitness trackers, and wellness products with clinical precision.",
    expertise: ["Health", "Wellness", "Medical Devices", "Fitness"],
    credentials: [
      "MD, Johns Hopkins University",
      "Board Certified in Internal Medicine",
      "Health Technology Consultant"
    ],
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "marcus-johnson",
    name: "Marcus Johnson",
    title: "Technology Editor",
    bio: "Former software engineer turned tech journalist with 15 years of experience covering consumer electronics, software, and emerging technologies. Marcus tests every product hands-on before recommending it.",
    expertise: ["Technology", "Software", "AI", "Gadgets", "Cybersecurity"],
    credentials: [
      "BS Computer Science, MIT",
      "Former Senior Engineer at Google",
      "Tech Reviewer since 2010"
    ],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    social: {
      twitter: "https://twitter.com/marcusjtech"
    }
  },
  {
    id: "emily-rodriguez",
    name: "Emily Rodriguez",
    title: "Lifestyle & Home Editor",
    bio: "Interior designer and lifestyle expert who helps readers create beautiful, functional spaces. Emily specializes in home security, smart home devices, and sustainable living products.",
    expertise: ["Home", "Lifestyle", "Smart Home", "Sustainability"],
    credentials: [
      "Certified Interior Designer (CID)",
      "LEED Green Associate",
      "Home Organization Specialist"
    ],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "david-kim",
    name: "David Kim, CFA",
    title: "Finance & Investing Editor",
    bio: "Chartered Financial Analyst with experience at top investment firms. David breaks down complex financial products and helps readers make informed decisions about their money.",
    expertise: ["Finance", "Investing", "Crypto", "Tax Software", "Banking"],
    credentials: [
      "CFA Charterholder",
      "MBA, Wharton School",
      "Former Portfolio Manager"
    ],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    social: {
      linkedin: "https://linkedin.com/in/davidkimcfa"
    }
  },
  {
    id: "jessica-taylor",
    name: "Jessica Taylor",
    title: "Education & Learning Editor",
    bio: "Former educator with a Master's in Educational Technology. Jessica evaluates online courses, learning platforms, and educational tools to help readers advance their skills.",
    expertise: ["Education", "Online Learning", "Career Development", "Productivity"],
    credentials: [
      "MEd Educational Technology",
      "Former High School Teacher",
      "Certified Online Instructor"
    ],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "alex-thompson",
    name: "Alex Thompson",
    title: "Travel & Adventure Editor",
    bio: "Travel writer and photographer who has visited 60+ countries. Alex tests travel gear, reviews booking platforms, and shares insider tips for both budget and luxury travelers.",
    expertise: ["Travel", "Adventure", "Outdoor Gear", "Photography"],
    credentials: [
      "Professional Travel Writer",
      "National Geographic Contributor",
      "Wilderness First Responder Certified"
    ],
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face",
    social: {
      twitter: "https://twitter.com/alexexplores"
    }
  }
];

// Map categories to primary authors
export const categoryAuthorMap: Record<string, string> = {
  "technology": "marcus-johnson",
  "software": "marcus-johnson",
  "ai": "marcus-johnson",
  "cybersecurity": "marcus-johnson",
  "finance": "david-kim",
  "investing": "david-kim",
  "crypto": "david-kim",
  "banking": "david-kim",
  "tax": "david-kim",
  "health": "sarah-chen",
  "wellness": "sarah-chen",
  "fitness": "sarah-chen",
  "medical": "sarah-chen",
  "home": "emily-rodriguez",
  "lifestyle": "emily-rodriguez",
  "smart home": "emily-rodriguez",
  "sustainability": "emily-rodriguez",
  "education": "jessica-taylor",
  "learning": "jessica-taylor",
  "career": "jessica-taylor",
  "productivity": "benjamin-franklin",
  "business": "benjamin-franklin",
  "travel": "alex-thompson",
  "adventure": "alex-thompson",
  "outdoor": "alex-thompson",
  "default": "benjamin-franklin"
};

// Get author by category
export function getAuthorByCategory(category: string): Author {
  const normalizedCategory = category.toLowerCase();
  const authorId = categoryAuthorMap[normalizedCategory] || categoryAuthorMap.default;
  return authors.find(a => a.id === authorId) || authors[0];
}

// Get author by ID
export function getAuthorById(id: string): Author | undefined {
  return authors.find(a => a.id === id);
}

// Get author for article based on keywords
export function getAuthorForArticle(keywords: string[]): Author {
  if (!keywords || keywords.length === 0) {
    return authors[0]; // Default to Benjamin Franklin
  }
  
  // Check each keyword against category map
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    for (const [category, authorId] of Object.entries(categoryAuthorMap)) {
      if (normalizedKeyword.includes(category) || category.includes(normalizedKeyword)) {
        const author = authors.find(a => a.id === authorId);
        if (author) return author;
      }
    }
  }
  
  return authors[0]; // Default to Benjamin Franklin
}
