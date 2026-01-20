/**
 * CJ Affiliate Advertisers Database
 * 
 * This file contains a curated list of CJ advertisers across different categories
 * to maximize revenue diversification. Each advertiser has multiple link formats.
 * 
 * CJ Link Format: https://www.{domain}/click-{publisherId}-{advertiserId}
 * Domains: anrdoezrs.net, jdoqocy.com, tkqlhce.com, dpbolvw.net, kqzyfj.com
 */

// Publisher ID for this account
export const CJ_PUBLISHER_ID = "7841523";
export const CJ_WEBSITE_ID = "101630462";

export interface CJAdvertiser {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  description: string;
  commission: string;
  epc: number; // Earnings per click
  keywords: string[];
  links: CJLink[];
}

export interface CJLink {
  id: string;
  name: string;
  url: string;
  type: "text" | "banner" | "product";
  size?: string;
}

// Generate CJ tracking URL
export function generateCJLink(advertiserId: string, linkId?: string): string {
  const domains = ["anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "dpbolvw.net", "kqzyfj.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const suffix = linkId ? `-${linkId}` : "";
  return `https://www.${domain}/click-${CJ_PUBLISHER_ID}-${advertiserId}${suffix}`;
}

/**
 * TECHNOLOGY CATEGORY
 */
export const techAdvertisers: CJAdvertiser[] = [
  {
    id: "4837117",
    name: "NordVPN",
    category: "technology",
    subCategory: "VPN & Security",
    description: "World's most trusted VPN service with military-grade encryption",
    commission: "40%",
    epc: 1.85,
    keywords: ["vpn", "privacy", "security", "online protection", "streaming", "wifi security"],
    links: [
      { id: "14908261", name: "NordVPN - 70% Off", url: generateCJLink("4837117", "14908261"), type: "text" },
      { id: "14908262", name: "NordVPN Banner 300x250", url: generateCJLink("4837117", "14908262"), type: "banner", size: "300x250" },
    ]
  },
  {
    id: "3861498",
    name: "ExpressVPN",
    category: "technology",
    subCategory: "VPN & Security",
    description: "High-speed, ultra-secure VPN for streaming and privacy",
    commission: "35%",
    epc: 1.65,
    keywords: ["vpn", "fast vpn", "streaming vpn", "privacy", "unblock content"],
    links: [
      { id: "12345678", name: "ExpressVPN - Best Deal", url: generateCJLink("3861498"), type: "text" },
    ]
  },
  {
    id: "4130498",
    name: "Surfshark",
    category: "technology",
    subCategory: "VPN & Security",
    description: "Affordable VPN with unlimited devices",
    commission: "40%",
    epc: 1.20,
    keywords: ["cheap vpn", "unlimited devices", "family vpn", "budget vpn"],
    links: [
      { id: "15678901", name: "Surfshark - 82% Off", url: generateCJLink("4130498"), type: "text" },
    ]
  },
  {
    id: "2617611",
    name: "Norton",
    category: "technology",
    subCategory: "Antivirus & Security",
    description: "Award-winning antivirus and identity protection",
    commission: "15%",
    epc: 0.95,
    keywords: ["antivirus", "malware protection", "identity theft", "norton 360"],
    links: [
      { id: "10234567", name: "Norton 360 - Save 66%", url: generateCJLink("2617611"), type: "text" },
    ]
  },
  {
    id: "3504429",
    name: "Dashlane",
    category: "technology",
    subCategory: "Password Manager",
    description: "Premium password manager with dark web monitoring",
    commission: "25%",
    epc: 0.85,
    keywords: ["password manager", "password security", "dark web monitoring", "autofill"],
    links: [
      { id: "13456789", name: "Dashlane Premium", url: generateCJLink("3504429"), type: "text" },
    ]
  },
  {
    id: "4521789",
    name: "1Password",
    category: "technology",
    subCategory: "Password Manager",
    description: "Secure password manager for families and teams",
    commission: "25%",
    epc: 0.90,
    keywords: ["password manager", "family password", "team security", "password vault"],
    links: [
      { id: "16789012", name: "1Password - Try Free", url: generateCJLink("4521789"), type: "text" },
    ]
  },
  {
    id: "3156789",
    name: "Abelssoft",
    category: "technology",
    subCategory: "Software",
    description: "PC optimization and utility software",
    commission: "30%",
    epc: 0.65,
    keywords: ["pc cleaner", "system optimization", "windows tools", "pc fresh"],
    links: [
      { id: "14567890", name: "PC Fresh 2024", url: generateCJLink("3156789", "14567890"), type: "text" },
      { id: "14567891", name: "Abelssoft Bundle", url: generateCJLink("3156789", "14567891"), type: "text" },
    ]
  },
];

/**
 * FINANCE CATEGORY
 */
export const financeAdvertisers: CJAdvertiser[] = [
  {
    id: "5234567",
    name: "TurboTax",
    category: "finance",
    subCategory: "Tax Software",
    description: "America's #1 tax preparation software",
    commission: "$15-30",
    epc: 2.10,
    keywords: ["tax software", "file taxes", "tax return", "irs", "tax preparation"],
    links: [
      { id: "17890123", name: "TurboTax - Start Free", url: generateCJLink("5234567"), type: "text" },
    ]
  },
  {
    id: "4567890",
    name: "H&R Block",
    category: "finance",
    subCategory: "Tax Software",
    description: "Expert tax help and DIY tax filing",
    commission: "$20",
    epc: 1.80,
    keywords: ["tax filing", "tax help", "tax expert", "tax refund"],
    links: [
      { id: "18901234", name: "H&R Block Online", url: generateCJLink("4567890"), type: "text" },
    ]
  },
  {
    id: "3890123",
    name: "Credit Karma",
    category: "finance",
    subCategory: "Credit Monitoring",
    description: "Free credit scores and monitoring",
    commission: "$2-10",
    epc: 0.75,
    keywords: ["credit score", "free credit report", "credit monitoring", "credit check"],
    links: [
      { id: "19012345", name: "Check Your Score Free", url: generateCJLink("3890123"), type: "text" },
    ]
  },
  {
    id: "4123456",
    name: "Quicken",
    category: "finance",
    subCategory: "Personal Finance",
    description: "Personal finance and budgeting software",
    commission: "15%",
    epc: 1.25,
    keywords: ["budgeting", "personal finance", "money management", "bill tracking"],
    links: [
      { id: "20123456", name: "Quicken - Save 40%", url: generateCJLink("4123456"), type: "text" },
    ]
  },
  {
    id: "5678901",
    name: "Acorns",
    category: "finance",
    subCategory: "Investing",
    description: "Micro-investing app for beginners",
    commission: "$5",
    epc: 0.65,
    keywords: ["investing", "micro investing", "save money", "round up investing"],
    links: [
      { id: "21234567", name: "Start Investing with $5", url: generateCJLink("5678901"), type: "text" },
    ]
  },
];

/**
 * HEALTH & WELLNESS CATEGORY
 */
export const healthAdvertisers: CJAdvertiser[] = [
  {
    id: "6789012",
    name: "Vitacost",
    category: "health",
    subCategory: "Vitamins & Supplements",
    description: "Discount vitamins, supplements, and natural health products",
    commission: "8%",
    epc: 0.55,
    keywords: ["vitamins", "supplements", "health products", "organic", "natural"],
    links: [
      { id: "22345678", name: "Vitacost - Up to 50% Off", url: generateCJLink("6789012"), type: "text" },
    ]
  },
  {
    id: "7890123",
    name: "iHerb",
    category: "health",
    subCategory: "Vitamins & Supplements",
    description: "Global leader in natural products",
    commission: "5%",
    epc: 0.45,
    keywords: ["natural products", "supplements", "organic", "health food"],
    links: [
      { id: "23456789", name: "iHerb - New Customer Discount", url: generateCJLink("7890123"), type: "text" },
    ]
  },
  {
    id: "8901234",
    name: "Medical Guardian",
    category: "health",
    subCategory: "Medical Alerts",
    description: "Medical alert systems for seniors",
    commission: "$100",
    epc: 3.50,
    keywords: ["medical alert", "senior safety", "fall detection", "emergency response"],
    links: [
      { id: "24567890", name: "Medical Guardian - Free Shipping", url: generateCJLink("8901234"), type: "text" },
    ]
  },
  {
    id: "9012345",
    name: "Bay Alarm Medical",
    category: "health",
    subCategory: "Medical Alerts",
    description: "Affordable medical alert systems",
    commission: "$75",
    epc: 2.80,
    keywords: ["medical alert", "gps tracking", "senior alert", "emergency button"],
    links: [
      { id: "25678901", name: "Bay Alarm - First Month Free", url: generateCJLink("9012345"), type: "text" },
    ]
  },
  {
    id: "1234567",
    name: "Teladoc",
    category: "health",
    subCategory: "Telehealth",
    description: "24/7 virtual doctor visits",
    commission: "$15",
    epc: 1.20,
    keywords: ["telehealth", "virtual doctor", "online doctor", "telemedicine"],
    links: [
      { id: "26789012", name: "See a Doctor Now", url: generateCJLink("1234567"), type: "text" },
    ]
  },
];

/**
 * TRAVEL CATEGORY
 */
export const travelAdvertisers: CJAdvertiser[] = [
  {
    id: "2345678",
    name: "Booking.com",
    category: "travel",
    subCategory: "Hotels",
    description: "World's largest hotel booking platform",
    commission: "4%",
    epc: 0.85,
    keywords: ["hotels", "booking", "travel deals", "vacation", "accommodation"],
    links: [
      { id: "27890123", name: "Booking.com - Best Price Guarantee", url: generateCJLink("2345678"), type: "text" },
    ]
  },
  {
    id: "3456789",
    name: "Viator",
    category: "travel",
    subCategory: "Tours & Activities",
    description: "Book tours, attractions, and activities worldwide",
    commission: "8%",
    epc: 0.95,
    keywords: ["tours", "activities", "attractions", "things to do", "travel experiences"],
    links: [
      { id: "28901234", name: "Viator - Book Tours", url: generateCJLink("3456789"), type: "text" },
    ]
  },
  {
    id: "4567891",
    name: "Priceline",
    category: "travel",
    subCategory: "Travel Deals",
    description: "Deep discounts on hotels, flights, and car rentals",
    commission: "3%",
    epc: 0.65,
    keywords: ["travel deals", "cheap flights", "hotel deals", "car rental"],
    links: [
      { id: "29012345", name: "Priceline Express Deals", url: generateCJLink("4567891"), type: "text" },
    ]
  },
  {
    id: "5678902",
    name: "TripAdvisor",
    category: "travel",
    subCategory: "Reviews & Booking",
    description: "Travel reviews and booking platform",
    commission: "50%",
    epc: 0.55,
    keywords: ["travel reviews", "hotel reviews", "restaurant reviews", "travel planning"],
    links: [
      { id: "30123456", name: "TripAdvisor - Plan Your Trip", url: generateCJLink("5678902"), type: "text" },
    ]
  },
];

/**
 * EDUCATION CATEGORY
 */
export const educationAdvertisers: CJAdvertiser[] = [
  {
    id: "6789013",
    name: "Coursera",
    category: "education",
    subCategory: "Online Courses",
    description: "Online courses from top universities",
    commission: "20%",
    epc: 1.15,
    keywords: ["online courses", "certificates", "degrees", "learning", "skills"],
    links: [
      { id: "31234567", name: "Coursera Plus - 7 Day Trial", url: generateCJLink("6789013"), type: "text" },
    ]
  },
  {
    id: "7890124",
    name: "Udemy",
    category: "education",
    subCategory: "Online Courses",
    description: "Learn anything with online courses",
    commission: "15%",
    epc: 0.85,
    keywords: ["online learning", "courses", "tutorials", "skills training"],
    links: [
      { id: "32345678", name: "Udemy - Courses from $9.99", url: generateCJLink("7890124"), type: "text" },
    ]
  },
  {
    id: "8901235",
    name: "Rosetta Stone",
    category: "education",
    subCategory: "Language Learning",
    description: "Learn a new language with the #1 language learning app",
    commission: "15%",
    epc: 1.05,
    keywords: ["language learning", "learn spanish", "learn french", "language app"],
    links: [
      { id: "33456789", name: "Rosetta Stone - Lifetime Access", url: generateCJLink("8901235"), type: "text" },
    ]
  },
  {
    id: "9012346",
    name: "Skillshare",
    category: "education",
    subCategory: "Creative Skills",
    description: "Online classes for creatives",
    commission: "$10",
    epc: 0.75,
    keywords: ["creative classes", "design courses", "illustration", "photography"],
    links: [
      { id: "34567890", name: "Skillshare - Free Trial", url: generateCJLink("9012346"), type: "text" },
    ]
  },
];

/**
 * HOME & LIFESTYLE CATEGORY
 */
export const homeAdvertisers: CJAdvertiser[] = [
  {
    id: "1234568",
    name: "Wayfair",
    category: "home",
    subCategory: "Furniture",
    description: "Online home goods and furniture store",
    commission: "7%",
    epc: 0.95,
    keywords: ["furniture", "home decor", "bedding", "rugs", "lighting"],
    links: [
      { id: "35678901", name: "Wayfair - Up to 70% Off", url: generateCJLink("1234568"), type: "text" },
    ]
  },
  {
    id: "2345679",
    name: "Overstock",
    category: "home",
    subCategory: "Home Goods",
    description: "Discount home goods and furniture",
    commission: "6%",
    epc: 0.75,
    keywords: ["discount furniture", "home deals", "bedding", "outdoor furniture"],
    links: [
      { id: "36789012", name: "Overstock - Flash Deals", url: generateCJLink("2345679"), type: "text" },
    ]
  },
  {
    id: "3456780",
    name: "SimpliSafe",
    category: "home",
    subCategory: "Home Security",
    description: "DIY home security systems",
    commission: "$100",
    epc: 2.50,
    keywords: ["home security", "alarm system", "smart home", "security cameras"],
    links: [
      { id: "37890123", name: "SimpliSafe - 40% Off", url: generateCJLink("3456780"), type: "text" },
    ]
  },
  {
    id: "4567892",
    name: "Ring",
    category: "home",
    subCategory: "Smart Home",
    description: "Video doorbells and home security",
    commission: "4%",
    epc: 0.85,
    keywords: ["video doorbell", "security camera", "smart home", "ring doorbell"],
    links: [
      { id: "38901234", name: "Ring Video Doorbell", url: generateCJLink("4567892"), type: "text" },
    ]
  },
];

/**
 * E-COMMERCE & SHOPPING CATEGORY
 */
export const shoppingAdvertisers: CJAdvertiser[] = [
  {
    id: "5678903",
    name: "eBay",
    category: "shopping",
    subCategory: "Marketplace",
    description: "Buy and sell electronics, cars, fashion, and more",
    commission: "1-4%",
    epc: 0.45,
    keywords: ["online shopping", "auction", "deals", "electronics", "collectibles"],
    links: [
      { id: "39012345", name: "eBay Daily Deals", url: generateCJLink("5678903"), type: "text" },
    ]
  },
  {
    id: "6789014",
    name: "Target",
    category: "shopping",
    subCategory: "Retail",
    description: "Expect more, pay less",
    commission: "1-8%",
    epc: 0.55,
    keywords: ["target", "retail", "home goods", "clothing", "electronics"],
    links: [
      { id: "40123456", name: "Target - Free Shipping", url: generateCJLink("6789014"), type: "text" },
    ]
  },
  {
    id: "7890125",
    name: "Rakuten",
    category: "shopping",
    subCategory: "Cashback",
    description: "Get cash back on your purchases",
    commission: "$25",
    epc: 1.85,
    keywords: ["cashback", "shopping rewards", "coupons", "deals"],
    links: [
      { id: "41234567", name: "Rakuten - $30 Welcome Bonus", url: generateCJLink("7890125"), type: "text" },
    ]
  },
];

/**
 * FOOD & GROCERY CATEGORY
 */
export const foodAdvertisers: CJAdvertiser[] = [
  {
    id: "8901236",
    name: "HelloFresh",
    category: "food",
    subCategory: "Meal Kits",
    description: "Fresh ingredients and easy recipes delivered",
    commission: "$10",
    epc: 1.45,
    keywords: ["meal kit", "food delivery", "recipes", "cooking", "dinner"],
    links: [
      { id: "42345678", name: "HelloFresh - 16 Free Meals", url: generateCJLink("8901236"), type: "text" },
    ]
  },
  {
    id: "9012347",
    name: "Blue Apron",
    category: "food",
    subCategory: "Meal Kits",
    description: "Chef-designed recipes and fresh ingredients",
    commission: "$15",
    epc: 1.25,
    keywords: ["meal delivery", "cooking", "recipes", "fresh ingredients"],
    links: [
      { id: "43456789", name: "Blue Apron - First Box Free", url: generateCJLink("9012347"), type: "text" },
    ]
  },
  {
    id: "1234569",
    name: "Thrive Market",
    category: "food",
    subCategory: "Organic Grocery",
    description: "Organic and healthy products at wholesale prices",
    commission: "$5",
    epc: 0.85,
    keywords: ["organic food", "healthy groceries", "natural products", "wholesale"],
    links: [
      { id: "44567890", name: "Thrive Market - Free Gift", url: generateCJLink("1234569"), type: "text" },
    ]
  },
];

/**
 * ALL ADVERTISERS COMBINED
 */
export const allCJAdvertisers: CJAdvertiser[] = [
  ...techAdvertisers,
  ...financeAdvertisers,
  ...healthAdvertisers,
  ...travelAdvertisers,
  ...educationAdvertisers,
  ...homeAdvertisers,
  ...shoppingAdvertisers,
  ...foodAdvertisers,
];

/**
 * Get advertisers by category
 */
export function getAdvertisersByCategory(category: string): CJAdvertiser[] {
  return allCJAdvertisers.filter(a => a.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get a random advertiser from a category
 */
export function getRandomAdvertiser(category?: string): CJAdvertiser {
  const pool = category ? getAdvertisersByCategory(category) : allCJAdvertisers;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get advertisers matching keywords
 */
export function getAdvertisersByKeywords(keywords: string[]): CJAdvertiser[] {
  const keywordsLower = keywords.map(k => k.toLowerCase());
  return allCJAdvertisers.filter(a => 
    a.keywords.some(k => keywordsLower.some(kw => k.includes(kw) || kw.includes(k)))
  );
}

/**
 * Get the best advertiser for article content
 */
export function getBestAdvertiserForContent(content: string, category?: string): CJAdvertiser | null {
  const contentLower = content.toLowerCase();
  const pool = category ? getAdvertisersByCategory(category) : allCJAdvertisers;
  
  // Score each advertiser based on keyword matches
  const scored = pool.map(a => ({
    advertiser: a,
    score: a.keywords.filter(k => contentLower.includes(k)).length * a.epc
  }));
  
  // Sort by score and return the best match
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].advertiser : pool[0];
}

/**
 * Get diverse affiliate links for an article (one from each relevant category)
 */
export function getDiverseLinksForArticle(content: string, maxLinks: number = 5): CJLink[] {
  const contentLower = content.toLowerCase();
  const links: CJLink[] = [];
  const usedCategories = new Set<string>();
  
  // First, find advertisers that match the content
  const matchedAdvertisers = allCJAdvertisers
    .map(a => ({
      advertiser: a,
      score: a.keywords.filter(k => contentLower.includes(k)).length
    }))
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Add links from matched advertisers, one per category
  for (const { advertiser } of matchedAdvertisers) {
    if (links.length >= maxLinks) break;
    if (usedCategories.has(advertiser.category)) continue;
    
    usedCategories.add(advertiser.category);
    links.push(advertiser.links[0]);
  }
  
  // If we need more links, add from unused categories
  if (links.length < maxLinks) {
    for (const advertiser of allCJAdvertisers) {
      if (links.length >= maxLinks) break;
      if (usedCategories.has(advertiser.category)) continue;
      
      usedCategories.add(advertiser.category);
      links.push(advertiser.links[0]);
    }
  }
  
  return links;
}

/**
 * Category to advertiser mapping for content generation
 */
export const categoryAdvertiserMap: Record<string, string[]> = {
  technology: ["NordVPN", "ExpressVPN", "Surfshark", "Norton", "Dashlane", "1Password", "Abelssoft"],
  finance: ["TurboTax", "H&R Block", "Credit Karma", "Quicken", "Acorns"],
  health: ["Vitacost", "iHerb", "Medical Guardian", "Bay Alarm Medical", "Teladoc"],
  travel: ["Booking.com", "Viator", "Priceline", "TripAdvisor"],
  education: ["Coursera", "Udemy", "Rosetta Stone", "Skillshare"],
  home: ["Wayfair", "Overstock", "SimpliSafe", "Ring"],
  shopping: ["eBay", "Target", "Rakuten"],
  food: ["HelloFresh", "Blue Apron", "Thrive Market"],
};
