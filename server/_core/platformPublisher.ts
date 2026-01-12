import { ENV } from "./env";

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
  platformId?: string;
}

interface ArticleData {
  title: string;
  content: string;
  tags?: string[];
  canonicalUrl?: string;
  coverImage?: string;
}

/**
 * Publish article to Dev.to
 * API Docs: https://developers.forem.com/api
 */
export async function publishToDevTo(article: ArticleData): Promise<PublishResult> {
  if (!ENV.devtoApiKey) {
    return { success: false, error: "Dev.to API key not configured" };
  }

  try {
    // Dev.to requires tags to be lowercase alphanumeric only (no spaces, max 4 tags)
    const formattedTags = (article.tags || [])
      .slice(0, 4)
      .map(tag => tag.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20))
      .filter(tag => tag.length > 0);
    
    console.log("[Dev.to] Publishing with tags:", formattedTags);
    
    const response = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": ENV.devtoApiKey,
      },
      body: JSON.stringify({
        article: {
          title: article.title,
          body_markdown: article.content,
          published: true,
          tags: formattedTags,
          canonical_url: article.canonicalUrl,
          main_image: article.coverImage,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Dev.to] Publish failed:", errorData);
      return { success: false, error: `Dev.to API error: ${response.status}` };
    }

    const data = await response.json();
    console.log("[Dev.to] Article published successfully:", data.url);
    
    return {
      success: true,
      url: data.url,
      platformId: data.id?.toString(),
    };
  } catch (error) {
    console.error("[Dev.to] Publish error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Publish article to Hastewire
 * Press release distribution platform
 */
export async function publishToHastewire(article: ArticleData): Promise<PublishResult> {
  if (!ENV.hastewireApiKey) {
    return { success: false, error: "Hastewire API key not configured" };
  }

  try {
    // Hastewire API endpoint for press releases
    const response = await fetch("https://api.hastewire.com/v1/releases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.hastewireApiKey}`,
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        tags: article.tags || [],
        publish_immediately: true,
        category: "technology", // Default category
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Hastewire] Publish failed:", errorData);
      return { success: false, error: `Hastewire API error: ${response.status}` };
    }

    const data = await response.json();
    console.log("[Hastewire] Press release published:", data.url || data.id);
    
    return {
      success: true,
      url: data.url || `https://hastewire.com/release/${data.id}`,
      platformId: data.id?.toString(),
    };
  } catch (error) {
    console.error("[Hastewire] Publish error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Publish to Medium (if API key is configured)
 */
export async function publishToMedium(article: ArticleData, apiKey: string): Promise<PublishResult> {
  if (!apiKey) {
    return { success: false, error: "Medium API key not configured" };
  }

  try {
    // First get user ID
    const userResponse = await fetch("https://api.medium.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      return { success: false, error: "Failed to get Medium user" };
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Create post
    const response = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        contentFormat: "markdown",
        content: article.content,
        tags: article.tags?.slice(0, 5) || [],
        publishStatus: "public",
        canonicalUrl: article.canonicalUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `Medium API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.data.url,
      platformId: data.data.id,
    };
  } catch (error) {
    console.error("[Medium] Publish error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Publish to LinkedIn (if API key is configured)
 */
export async function publishToLinkedIn(article: ArticleData, accessToken: string): Promise<PublishResult> {
  if (!accessToken) {
    return { success: false, error: "LinkedIn access token not configured" };
  }

  try {
    // Get user URN first
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      return { success: false, error: "Failed to get LinkedIn profile" };
    }

    const profileData = await profileResponse.json();
    const authorUrn = `urn:li:person:${profileData.id}`;

    // Create article post
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: `${article.title}\n\n${article.content.substring(0, 1300)}...`,
            },
            shareMediaCategory: "ARTICLE",
            media: [{
              status: "READY",
              originalUrl: article.canonicalUrl,
              title: { text: article.title },
            }],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `LinkedIn API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
      platformId: data.id,
    };
  } catch (error) {
    console.error("[LinkedIn] Publish error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Publish to Hashnode (if API key is configured)
 */
export async function publishToHashnode(article: ArticleData, apiKey: string, publicationId: string): Promise<PublishResult> {
  if (!apiKey) {
    return { success: false, error: "Hashnode API key not configured" };
  }

  try {
    const response = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        query: `
          mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) {
              post {
                id
                url
              }
            }
          }
        `,
        variables: {
          input: {
            title: article.title,
            contentMarkdown: article.content,
            tags: article.tags?.map(tag => ({ slug: tag.toLowerCase().replace(/\s+/g, '-') })) || [],
            publicationId: publicationId,
            coverImageOptions: article.coverImage ? { coverImageURL: article.coverImage } : undefined,
          },
        },
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Hashnode API error: ${response.status}` };
    }

    const data = await response.json();
    if (data.errors) {
      return { success: false, error: data.errors[0]?.message || "Hashnode error" };
    }

    return {
      success: true,
      url: data.data.publishPost.post.url,
      platformId: data.data.publishPost.post.id,
    };
  } catch (error) {
    console.error("[Hashnode] Publish error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Main function to publish to a specific platform
 */
export async function publishToPlatform(
  platform: string,
  article: ArticleData,
  platformApiKey?: string
): Promise<PublishResult> {
  switch (platform.toLowerCase()) {
    case "devto":
    case "dev.to":
      return publishToDevTo(article);
    
    case "hastewire":
      return publishToHastewire(article);
    
    case "medium":
      return publishToMedium(article, platformApiKey || "");
    
    case "linkedin":
      return publishToLinkedIn(article, platformApiKey || "");
    
    case "hashnode":
      return publishToHashnode(article, platformApiKey || "", "");
    
    default:
      return { success: false, error: `Platform ${platform} not supported for auto-publishing` };
  }
}

/**
 * Check which platforms have API keys configured
 */
export function getConfiguredPlatforms(): string[] {
  const platforms: string[] = [];
  
  if (ENV.devtoApiKey) platforms.push("devto");
  if (ENV.hastewireApiKey) platforms.push("hastewire");
  
  return platforms;
}
