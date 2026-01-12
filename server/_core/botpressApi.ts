import { ENV } from "./env";

const BOTPRESS_CHAT_URL = "https://chat.botpress.cloud";

interface BotpressUser {
  id: string;
  key: string;
}

interface BotpressConversation {
  id: string;
}

interface BotpressMessage {
  id: string;
  conversationId: string;
  userId: string;
  payload: {
    type: string;
    text?: string;
  };
  createdAt: string;
}

interface BotpressResponse {
  messages: BotpressMessage[];
}

/**
 * Botpress Chat API Service
 * Integrates with Botpress Cloud for custom bot management
 */
export class BotpressService {
  private webhookId: string;
  private userKey: string | null = null;
  private userId: string | null = null;
  private conversationId: string | null = null;

  constructor(webhookId: string) {
    this.webhookId = webhookId;
  }

  private get baseUrl(): string {
    return `${BOTPRESS_CHAT_URL}/${this.webhookId}`;
  }

  /**
   * Check if the Botpress API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/hello`);
      return response.ok;
    } catch (error) {
      console.error("[Botpress] Health check failed:", error);
      return false;
    }
  }

  /**
   * Create a new user for the chat session
   */
  async createUser(name?: string): Promise<BotpressUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name || "MoneyMachine Bot Manager",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      const data = await response.json();
      this.userKey = data.key;
      this.userId = data.user.id;
      
      return {
        id: data.user.id,
        key: data.key,
      };
    } catch (error) {
      console.error("[Botpress] Failed to create user:", error);
      return null;
    }
  }

  /**
   * Create a new conversation with the bot
   */
  async createConversation(): Promise<BotpressConversation | null> {
    if (!this.userKey) {
      console.error("[Botpress] No user key available. Call createUser first.");
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-key": this.userKey,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      const data = await response.json();
      this.conversationId = data.conversation.id;
      
      return {
        id: data.conversation.id,
      };
    } catch (error) {
      console.error("[Botpress] Failed to create conversation:", error);
      return null;
    }
  }

  /**
   * Send a message to the bot
   */
  async sendMessage(text: string, conversationId?: string): Promise<BotpressMessage | null> {
    const convId = conversationId || this.conversationId;
    
    if (!this.userKey) {
      console.error("[Botpress] No user key available. Call createUser first.");
      return null;
    }

    if (!convId) {
      console.error("[Botpress] No conversation ID available. Call createConversation first.");
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/conversations/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-key": this.userKey,
        },
        body: JSON.stringify({
          payload: {
            type: "text",
            text: text,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error("[Botpress] Failed to send message:", error);
      return null;
    }
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId?: string): Promise<BotpressMessage[]> {
    const convId = conversationId || this.conversationId;
    
    if (!this.userKey) {
      console.error("[Botpress] No user key available.");
      return [];
    }

    if (!convId) {
      console.error("[Botpress] No conversation ID available.");
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/conversations/${convId}/messages`, {
        method: "GET",
        headers: {
          "x-user-key": this.userKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error("[Botpress] Failed to get messages:", error);
      return [];
    }
  }

  /**
   * Initialize a bot session and return the session info
   */
  async initSession(): Promise<{
    userId: string;
    userKey: string;
    conversationId: string;
  } | null> {
    const user = await this.createUser();
    if (!user) return null;

    const conversation = await this.createConversation();
    if (!conversation) return null;

    return {
      userId: user.id,
      userKey: user.key,
      conversationId: conversation.id,
    };
  }

  /**
   * Send a command to the bot and wait for response
   */
  async executeCommand(command: string): Promise<string | null> {
    const sent = await this.sendMessage(command);
    if (!sent) return null;

    // Wait a bit for the bot to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const messages = await this.getMessages();
    
    // Find the bot's response (messages after our sent message)
    const botMessages = messages.filter(
      m => m.userId !== this.userId && 
      new Date(m.createdAt) > new Date(sent.createdAt)
    );

    if (botMessages.length > 0) {
      const lastBotMessage = botMessages[botMessages.length - 1];
      return lastBotMessage.payload.text || null;
    }

    return null;
  }
}

/**
 * Create a Botpress service instance from the API key
 * The API key should be the webhook ID from Botpress
 */
export function createBotpressService(): BotpressService | null {
  const webhookId = ENV.botpressApiKey;
  
  if (!webhookId) {
    console.warn("[Botpress] No webhook ID configured. Set BOTPRESS_API environment variable.");
    return null;
  }

  return new BotpressService(webhookId);
}

/**
 * Bot efficiency commands for the MoneyMachine platform
 */
export const BotCommands = {
  ANALYZE_PERFORMANCE: "Analyze the current content performance and suggest optimizations",
  OPTIMIZE_AFFILIATE: "Review affiliate link placement and suggest improvements for higher conversions",
  GENERATE_TOPICS: "Generate trending topic ideas for new content",
  REVIEW_SEO: "Review SEO performance and suggest keyword improvements",
  EFFICIENCY_REPORT: "Generate an efficiency report for the content automation system",
  MARKET_TRENDS: "Analyze current market trends for affiliate opportunities",
};
