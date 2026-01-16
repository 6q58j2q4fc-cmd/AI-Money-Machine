/**
 * NFT Export Service
 * Generates downloadable NFT packages for manual upload to external marketplaces
 */

import { getDb } from "../db";
import { nftAssets, nftListings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// External marketplace upload URLs and requirements
export const MARKETPLACE_UPLOAD_INFO = {
  opensea: {
    name: "OpenSea",
    uploadUrl: "https://opensea.io/asset/create",
    requirements: [
      "Image file (PNG, JPG, GIF, SVG, MP4, WEBM, MP3, WAV, OGG, GLB, GLTF) max 100MB",
      "Name (required)",
      "External link (optional)",
      "Description (optional)",
      "Collection (optional)",
      "Properties, Levels, Stats (optional)",
      "Unlockable content (optional)",
      "Explicit & sensitive content toggle",
      "Supply quantity",
      "Blockchain selection (Ethereum, Polygon, etc.)"
    ],
    metadataFormat: "opensea",
    acceptedFormats: ["png", "jpg", "gif", "svg", "mp4", "webm", "glb"],
    maxFileSize: "100MB"
  },
  rarible: {
    name: "Rarible",
    uploadUrl: "https://rarible.com/create",
    requirements: [
      "Image file (PNG, GIF, WEBP, MP4, MP3) max 100MB",
      "Name (required)",
      "Description (optional)",
      "Royalties percentage (0-50%)",
      "Collection selection",
      "Properties (optional)",
      "Put on sale toggle with price"
    ],
    metadataFormat: "rarible",
    acceptedFormats: ["png", "gif", "webp", "mp4", "mp3"],
    maxFileSize: "100MB"
  },
  foundation: {
    name: "Foundation",
    uploadUrl: "https://foundation.app/create",
    requirements: [
      "Image file (JPG, PNG, GIF, MP4) max 50MB",
      "Title (required)",
      "Description (required)",
      "Reserve price in ETH",
      "Must be approved creator"
    ],
    metadataFormat: "foundation",
    acceptedFormats: ["jpg", "png", "gif", "mp4"],
    maxFileSize: "50MB"
  },
  blur: {
    name: "Blur",
    uploadUrl: "https://blur.io/create",
    requirements: [
      "Image file (PNG, JPG, GIF, SVG) max 100MB",
      "Name (required)",
      "Collection (required)",
      "Traits/Properties (optional)",
      "Royalty percentage"
    ],
    metadataFormat: "blur",
    acceptedFormats: ["png", "jpg", "gif", "svg"],
    maxFileSize: "100MB"
  },
  looksrare: {
    name: "LooksRare",
    uploadUrl: "https://looksrare.org/create",
    requirements: [
      "Image file (PNG, JPG, GIF, SVG, MP4) max 100MB",
      "Name (required)",
      "Description (optional)",
      "Collection (optional)",
      "Properties (optional)"
    ],
    metadataFormat: "looksrare",
    acceptedFormats: ["png", "jpg", "gif", "svg", "mp4"],
    maxFileSize: "100MB"
  },
  magiceden: {
    name: "Magic Eden",
    uploadUrl: "https://magiceden.io/create",
    requirements: [
      "Image file (PNG, JPG, GIF) max 15MB",
      "Name (required)",
      "Description (optional)",
      "Symbol (required for collections)",
      "Royalty percentage (0-10%)",
      "Blockchain: Solana, Ethereum, Polygon, Bitcoin"
    ],
    metadataFormat: "magiceden",
    acceptedFormats: ["png", "jpg", "gif"],
    maxFileSize: "15MB"
  },
  superrare: {
    name: "SuperRare",
    uploadUrl: "https://superrare.com/create",
    requirements: [
      "Image file (PNG, JPG, GIF, MP4) max 50MB",
      "Title (required)",
      "Description (required)",
      "Must be approved artist",
      "Edition size",
      "Royalty percentage"
    ],
    metadataFormat: "superrare",
    acceptedFormats: ["png", "jpg", "gif", "mp4"],
    maxFileSize: "50MB"
  },
  zora: {
    name: "Zora",
    uploadUrl: "https://zora.co/create",
    requirements: [
      "Image file (PNG, JPG, GIF, MP4, MP3) max 100MB",
      "Name (required)",
      "Description (optional)",
      "Price (free mint or set price)",
      "Edition size (open or limited)"
    ],
    metadataFormat: "zora",
    acceptedFormats: ["png", "jpg", "gif", "mp4", "mp3"],
    maxFileSize: "100MB"
  },
  niftygateway: {
    name: "Nifty Gateway",
    uploadUrl: "https://www.niftygateway.com/become-creator",
    requirements: [
      "Must apply to become a creator",
      "Image file (PNG, JPG, GIF, MP4)",
      "Title and description",
      "Edition size",
      "Price in USD"
    ],
    metadataFormat: "niftygateway",
    acceptedFormats: ["png", "jpg", "gif", "mp4"],
    maxFileSize: "50MB"
  },
  async: {
    name: "Async Art",
    uploadUrl: "https://async.art/create",
    requirements: [
      "Image file (PNG, JPG, GIF) max 50MB",
      "Title (required)",
      "Description (required)",
      "Layers (for programmable art)",
      "Master and layer pricing"
    ],
    metadataFormat: "async",
    acceptedFormats: ["png", "jpg", "gif"],
    maxFileSize: "50MB"
  }
};

// Auto-buyer platforms with submission info
export const AUTO_BUYER_PLATFORMS = {
  nightcafe: {
    name: "NightCafe",
    url: "https://creator.nightcafe.studio/sell-ai-art",
    description: "AI art marketplace that buys and sells AI-generated artwork",
    payoutRange: "$5-$50 per piece",
    requirements: ["High resolution image", "Original AI-generated artwork", "No copyrighted content"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://creator.nightcafe.studio/sell-ai-art"
  },
  wirestock: {
    name: "Wirestock",
    url: "https://wirestock.io",
    description: "Distributes your content to multiple stock agencies",
    payoutRange: "$0.25-$100+ per download",
    requirements: ["4MP+ resolution", "Model/property releases if needed", "Original content"],
    autoSubmitSupported: true,
    apiEndpoint: "https://api.wirestock.io/v1/upload"
  },
  adobestock: {
    name: "Adobe Stock",
    url: "https://contributor.stock.adobe.com",
    description: "Premium stock marketplace by Adobe",
    payoutRange: "$0.33-$70+ per download",
    requirements: ["4MP+ resolution", "Technical quality standards", "Model releases"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://contributor.stock.adobe.com/upload"
  },
  shutterstock: {
    name: "Shutterstock",
    url: "https://submit.shutterstock.com",
    description: "One of the largest stock content marketplaces",
    payoutRange: "$0.25-$120+ per download",
    requirements: ["4MP+ resolution", "No watermarks", "Original content"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://submit.shutterstock.com"
  },
  gettyimages: {
    name: "Getty Images",
    url: "https://contributors.gettyimages.com",
    description: "Premium stock photography marketplace",
    payoutRange: "15-45% royalty",
    requirements: ["High resolution", "Editorial or creative content", "Model releases"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://contributors.gettyimages.com"
  },
  alamy: {
    name: "Alamy",
    url: "https://www.alamy.com/contributor",
    description: "Stock photography with high payouts",
    payoutRange: "40-50% royalty",
    requirements: ["17MP+ for RM, 6MP+ for RF", "Technical quality", "Accurate keywording"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://www.alamy.com/contributor/upload"
  },
  dreamstime: {
    name: "Dreamstime",
    url: "https://www.dreamstime.com/sell-stock-photos",
    description: "Stock photography marketplace",
    payoutRange: "25-60% royalty",
    requirements: ["3MP+ resolution", "Original content", "Good technical quality"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://www.dreamstime.com/upload"
  },
  pond5: {
    name: "Pond5",
    url: "https://www.pond5.com/sell-media",
    description: "Video and media marketplace",
    payoutRange: "40-60% royalty",
    requirements: ["HD+ resolution for video", "Original content", "No copyrighted material"],
    autoSubmitSupported: false,
    manualSubmitUrl: "https://www.pond5.com/artist-upload"
  }
};

// Generate OpenSea-compatible metadata
function generateOpenSeaMetadata(nft: any) {
  return {
    name: nft.name,
    description: nft.description || `${nft.name} - AI-generated NFT artwork in the ${nft.category} style.`,
    image: nft.imageUrl,
    external_url: `https://monetizemac-rymvrvam.manus.space/marketplace/${nft.id}`,
    attributes: [
      { trait_type: "Category", value: nft.category },
      { trait_type: "Style", value: nft.style || "AI Generated" },
      { trait_type: "Rarity", value: nft.rarity || "Common" },
      { trait_type: "Token ID", value: nft.tokenId || nft.id.toString() },
      { trait_type: "Chain", value: nft.chain || "polygon" },
      { trait_type: "Creator", value: "MoneyMachine AI" },
      { display_type: "date", trait_type: "Created", value: Math.floor(new Date(nft.createdAt).getTime() / 1000) }
    ],
    properties: {
      category: nft.category,
      creator: "MoneyMachine AI",
      generation_method: "AI",
      blockchain: nft.chain || "polygon"
    }
  };
}

// Generate Rarible-compatible metadata
function generateRaribleMetadata(nft: any) {
  return {
    name: nft.name,
    description: nft.description || `${nft.name} - Unique AI-generated digital artwork.`,
    image: nft.imageUrl,
    external_url: `https://monetizemac-rymvrvam.manus.space/marketplace/${nft.id}`,
    attributes: [
      { key: "Category", value: nft.category },
      { key: "Style", value: nft.style || "AI Generated" },
      { key: "Rarity", value: nft.rarity || "Common" }
    ]
  };
}

// Generate generic ERC-721 metadata
function generateERC721Metadata(nft: any) {
  return {
    name: nft.name,
    description: nft.description || `${nft.name} - AI-generated NFT.`,
    image: nft.imageUrl,
    attributes: [
      { trait_type: "Category", value: nft.category },
      { trait_type: "Token ID", value: nft.tokenId || nft.id.toString() }
    ]
  };
}

// Get NFT export package
export async function getNftExportPackage(nftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [nft] = await db.select().from(nftAssets).where(eq(nftAssets.id, nftId));
  
  if (!nft) {
    throw new Error("NFT not found");
  }
  
  const listings = await db.select().from(nftListings).where(eq(nftListings.nftAssetId, nftId));
  
  // Generate metadata for different platforms
  const metadata = {
    opensea: generateOpenSeaMetadata(nft),
    rarible: generateRaribleMetadata(nft),
    generic: generateERC721Metadata(nft)
  };
  
  // Get marketplace info with upload URLs
  const marketplaceInfo = Object.entries(MARKETPLACE_UPLOAD_INFO).map(([key, info]) => ({
    id: key,
    ...info,
    isListed: listings.some((l: any) => l.marketplace?.toLowerCase() === key),
    listingUrl: listings.find((l: any) => l.marketplace?.toLowerCase() === key)?.listingUrl
  }));
  
  return {
    nft: {
      id: nft.id,
      name: nft.name,
      description: nft.description,
      imageUrl: nft.imageUrl,
      category: nft.category,
      chain: nft.chain,
      tokenId: nft.tokenId,
      contractAddress: nft.contractAddress,
      estimatedValue: nft.estimatedValue,
      createdAt: nft.createdAt
    },
    metadata,
    marketplaces: marketplaceInfo,
    autoBuyers: Object.entries(AUTO_BUYER_PLATFORMS).map(([key, info]) => ({
      id: key,
      ...info
    })),
    downloadUrls: {
      image: nft.imageUrl,
      metadataJson: `/api/nft/${nftId}/metadata.json`,
      fullPackage: `/api/nft/${nftId}/package.zip`
    }
  };
}

// Get all marketplace upload links
export function getMarketplaceUploadLinks() {
  return Object.entries(MARKETPLACE_UPLOAD_INFO).map(([key, info]) => ({
    id: key,
    name: info.name,
    uploadUrl: info.uploadUrl,
    requirements: info.requirements,
    acceptedFormats: info.acceptedFormats,
    maxFileSize: info.maxFileSize
  }));
}

// Get all auto-buyer platform info
export function getAutoBuyerPlatformInfo() {
  return Object.entries(AUTO_BUYER_PLATFORMS).map(([key, info]) => ({
    id: key,
    name: info.name,
    url: info.url,
    description: info.description,
    payoutRange: info.payoutRange,
    requirements: info.requirements,
    autoSubmitSupported: info.autoSubmitSupported,
    manualSubmitUrl: (info as any).manualSubmitUrl || info.url
  }));
}

// Generate SEO-optimized NFT description
export function generateSeoDescription(nft: any) {
  const keywords = [
    nft.category,
    "NFT",
    "digital art",
    "AI generated",
    "blockchain",
    "crypto art",
    "collectible",
    nft.chain || "polygon"
  ];
  
  return {
    title: `${nft.name} | ${nft.category} NFT | AI Digital Art`,
    description: `Buy ${nft.name}, a unique ${nft.category} NFT created by AI. This one-of-a-kind digital artwork is available on multiple marketplaces. Estimated value: ${nft.estimatedValue} ETH.`,
    keywords: keywords.join(", "),
    hashtags: keywords.map(k => `#${k.replace(/\s+/g, "")}`).join(" "),
    socialPost: `🎨 Check out "${nft.name}" - a stunning ${nft.category} NFT! 🚀\n\n💎 Estimated Value: ${nft.estimatedValue} ETH\n🔗 View on marketplace\n\n${keywords.slice(0, 5).map(k => `#${k.replace(/\s+/g, "")}`).join(" ")}`
  };
}
