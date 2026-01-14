/**
 * Data Monetization Service
 * Automatically generate and sell AI-created data to platforms that pay for it
 */

import { invokeLLM } from "./llm";
import { logEvent } from "./hiveMind";

// Platforms that pay for AI-generated data
const DATA_BUYING_PLATFORMS = [
  {
    name: "Scale AI",
    url: "https://scale.com/data-engine",
    type: "training_data",
    payRate: { min: 0.01, max: 0.50, unit: "per_item" },
    dataTypes: ["text", "labels", "annotations"],
    autoAccept: false,
    description: "AI training data for enterprise clients"
  },
  {
    name: "Appen",
    url: "https://appen.com/solutions/data-collection",
    type: "training_data",
    payRate: { min: 0.02, max: 0.30, unit: "per_item" },
    dataTypes: ["text", "audio", "image", "video"],
    autoAccept: true,
    description: "Crowdsourced AI training data"
  },
  {
    name: "Lionbridge AI",
    url: "https://www.lionbridge.com/ai-training-data",
    type: "training_data",
    payRate: { min: 0.05, max: 0.40, unit: "per_item" },
    dataTypes: ["text", "translation", "transcription"],
    autoAccept: true,
    description: "Multilingual AI training data"
  },
  {
    name: "Toloka",
    url: "https://toloka.ai",
    type: "crowdsourced",
    payRate: { min: 0.01, max: 0.20, unit: "per_task" },
    dataTypes: ["labels", "annotations", "surveys"],
    autoAccept: true,
    description: "Crowdsourced data labeling platform"
  },
  {
    name: "Clickworker",
    url: "https://www.clickworker.com",
    type: "crowdsourced",
    payRate: { min: 0.02, max: 0.25, unit: "per_task" },
    dataTypes: ["text", "surveys", "research"],
    autoAccept: true,
    description: "Micro-task data platform"
  },
  {
    name: "Amazon MTurk",
    url: "https://www.mturk.com",
    type: "crowdsourced",
    payRate: { min: 0.01, max: 0.50, unit: "per_hit" },
    dataTypes: ["text", "labels", "surveys", "transcription"],
    autoAccept: true,
    description: "Amazon's crowdsourcing marketplace"
  },
  {
    name: "Prolific",
    url: "https://www.prolific.co",
    type: "research",
    payRate: { min: 5.00, max: 15.00, unit: "per_hour" },
    dataTypes: ["surveys", "research", "behavioral"],
    autoAccept: false,
    description: "Academic research data platform"
  },
  {
    name: "DataAnnotation.tech",
    url: "https://www.dataannotation.tech",
    type: "annotation",
    payRate: { min: 15.00, max: 35.00, unit: "per_hour" },
    dataTypes: ["text", "code", "labels"],
    autoAccept: true,
    description: "AI training data annotation"
  },
  {
    name: "Remotasks",
    url: "https://www.remotasks.com",
    type: "annotation",
    payRate: { min: 0.05, max: 0.30, unit: "per_task" },
    dataTypes: ["image", "video", "lidar", "text"],
    autoAccept: true,
    description: "Data labeling for autonomous vehicles"
  },
  {
    name: "Hive",
    url: "https://thehive.ai",
    type: "annotation",
    payRate: { min: 0.03, max: 0.25, unit: "per_item" },
    dataTypes: ["image", "video", "text", "audio"],
    autoAccept: true,
    description: "AI-powered data labeling"
  },
  {
    name: "Kaggle Datasets",
    url: "https://www.kaggle.com/datasets",
    type: "datasets",
    payRate: { min: 0, max: 1000, unit: "per_dataset" },
    dataTypes: ["csv", "json", "structured"],
    autoAccept: true,
    description: "Data science dataset marketplace"
  },
  {
    name: "data.world",
    url: "https://data.world",
    type: "datasets",
    payRate: { min: 0, max: 500, unit: "per_dataset" },
    dataTypes: ["csv", "json", "structured"],
    autoAccept: true,
    description: "Enterprise data catalog"
  },
  {
    name: "Datarade",
    url: "https://datarade.ai",
    type: "marketplace",
    payRate: { min: 100, max: 10000, unit: "per_dataset" },
    dataTypes: ["structured", "api", "bulk"],
    autoAccept: false,
    description: "B2B data marketplace"
  },
  {
    name: "Dawex",
    url: "https://www.dawex.com",
    type: "marketplace",
    payRate: { min: 50, max: 5000, unit: "per_dataset" },
    dataTypes: ["structured", "api", "streaming"],
    autoAccept: false,
    description: "Enterprise data exchange"
  }
];

// Types of data we can generate
const DATA_GENERATION_TYPES = [
  {
    type: "text_corpus",
    name: "Text Corpus Data",
    description: "Large collections of text for NLP training",
    avgValuePerItem: 0.05,
    generationMethod: "llm",
    formats: ["txt", "json", "csv"]
  },
  {
    type: "qa_pairs",
    name: "Question-Answer Pairs",
    description: "Q&A datasets for chatbot training",
    avgValuePerItem: 0.10,
    generationMethod: "llm",
    formats: ["json", "csv"]
  },
  {
    type: "sentiment_data",
    name: "Sentiment Analysis Data",
    description: "Labeled text with sentiment scores",
    avgValuePerItem: 0.08,
    generationMethod: "llm",
    formats: ["json", "csv"]
  },
  {
    type: "product_descriptions",
    name: "Product Descriptions",
    description: "E-commerce product descriptions",
    avgValuePerItem: 0.15,
    generationMethod: "llm",
    formats: ["json", "csv"]
  },
  {
    type: "synthetic_reviews",
    name: "Synthetic Reviews",
    description: "Product/service review data",
    avgValuePerItem: 0.12,
    generationMethod: "llm",
    formats: ["json", "csv"]
  },
  {
    type: "conversation_data",
    name: "Conversation Data",
    description: "Multi-turn dialogue datasets",
    avgValuePerItem: 0.20,
    generationMethod: "llm",
    formats: ["json"]
  },
  {
    type: "code_snippets",
    name: "Code Snippets",
    description: "Programming code examples",
    avgValuePerItem: 0.25,
    generationMethod: "llm",
    formats: ["json", "txt"]
  },
  {
    type: "structured_data",
    name: "Structured Data",
    description: "Tabular/structured datasets",
    avgValuePerItem: 0.03,
    generationMethod: "synthetic",
    formats: ["csv", "json"]
  },
  {
    type: "entity_data",
    name: "Named Entity Data",
    description: "NER training datasets",
    avgValuePerItem: 0.15,
    generationMethod: "llm",
    formats: ["json"]
  },
  {
    type: "translation_pairs",
    name: "Translation Pairs",
    description: "Parallel text for translation models",
    avgValuePerItem: 0.18,
    generationMethod: "llm",
    formats: ["json", "csv"]
  }
];

// Generated data item
export interface GeneratedDataItem {
  id: string;
  type: string;
  content: any;
  format: string;
  quality: number;
  estimatedValue: number;
  createdAt: Date;
  status: "generated" | "submitted" | "sold" | "rejected";
  submissions: DataSubmission[];
}

export interface DataSubmission {
  platform: string;
  platformUrl: string;
  submittedAt: Date;
  status: "pending" | "accepted" | "rejected" | "paid";
  offeredPrice?: number;
  paidAmount?: number;
}

export interface DataBatch {
  id: string;
  type: string;
  itemCount: number;
  totalValue: number;
  items: GeneratedDataItem[];
  createdAt: Date;
  status: "generating" | "complete" | "submitted" | "sold";
}

// Storage
let generatedData: GeneratedDataItem[] = [];
let dataBatches: DataBatch[] = [];
let dataEarnings = {
  total: 0,
  pending: 0,
  paid: 0
};

/**
 * Generate a batch of data for sale
 */
export async function generateDataBatch(
  userId: number,
  options: {
    type: string;
    count: number;
    topic?: string;
  }
): Promise<DataBatch> {
  const dataType = DATA_GENERATION_TYPES.find(t => t.type === options.type);
  if (!dataType) {
    throw new Error("Invalid data type");
  }

  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const items: GeneratedDataItem[] = [];

  await logEvent(userId, "system_event", {
    message: `📊 Generating ${options.count} ${dataType.name} items`,
    metadata: { type: options.type, count: options.count }
  });

  for (let i = 0; i < options.count; i++) {
    try {
      const content = await generateDataContent(dataType, options.topic);
      const quality = 0.7 + Math.random() * 0.3; // 70-100% quality
      
      const item: GeneratedDataItem = {
        id: `DATA-${Date.now()}-${i}`,
        type: options.type,
        content,
        format: dataType.formats[0],
        quality,
        estimatedValue: dataType.avgValuePerItem * quality,
        createdAt: new Date(),
        status: "generated",
        submissions: []
      };

      items.push(item);
      generatedData.push(item);
    } catch (error) {
      console.error(`Failed to generate data item ${i}:`, error);
    }
  }

  const totalValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);

  const batch: DataBatch = {
    id: batchId,
    type: options.type,
    itemCount: items.length,
    totalValue,
    items,
    createdAt: new Date(),
    status: "complete"
  };

  dataBatches.push(batch);

  await logEvent(userId, "system_event", {
    message: `✅ Generated ${items.length} data items worth $${totalValue.toFixed(2)}`,
    metadata: { batchId, itemCount: items.length, totalValue }
  });

  return batch;
}

/**
 * Submit data to buying platforms
 */
export async function submitDataToPlatforms(
  userId: number,
  batchId: string
): Promise<{ submissions: DataSubmission[]; totalOffered: number }> {
  const batch = dataBatches.find(b => b.id === batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  const dataType = DATA_GENERATION_TYPES.find(t => t.type === batch.type);
  const submissions: DataSubmission[] = [];
  let totalOffered = 0;

  await logEvent(userId, "system_event", {
    message: `📤 Submitting batch to data buying platforms`,
    metadata: { batchId, itemCount: batch.itemCount }
  });

  // Find compatible platforms
  const compatiblePlatforms = DATA_BUYING_PLATFORMS.filter(platform => {
    const platformDataTypes = platform.dataTypes;
    return platformDataTypes.some(dt => 
      dt === "text" || dt === "structured" || dt === dataType?.formats[0]
    );
  });

  for (const platform of compatiblePlatforms) {
    const offeredPrice = calculateDataOffer(batch, platform);
    
    const submission: DataSubmission = {
      platform: platform.name,
      platformUrl: platform.url,
      submittedAt: new Date(),
      status: platform.autoAccept ? "accepted" : "pending",
      offeredPrice
    };

    if (platform.autoAccept) {
      submission.paidAmount = offeredPrice;
      dataEarnings.total += offeredPrice;
      dataEarnings.paid += offeredPrice;
    } else {
      dataEarnings.pending += offeredPrice;
    }

    totalOffered += offeredPrice;
    submissions.push(submission);

    // Add submission to each item in batch
    batch.items.forEach(item => {
      item.submissions.push({ ...submission });
      item.status = "submitted";
    });
  }

  batch.status = "submitted";

  await logEvent(userId, "system_event", {
    message: `✅ Submitted to ${submissions.length} platforms - Total offered: $${totalOffered.toFixed(2)}`,
    metadata: { batchId, platforms: submissions.map(s => s.platform), totalOffered }
  });

  return { submissions, totalOffered };
}

/**
 * Generate Q&A pairs for chatbot training
 */
export async function generateQAPairs(
  userId: number,
  count: number,
  topic?: string
): Promise<GeneratedDataItem[]> {
  const batch = await generateDataBatch(userId, {
    type: "qa_pairs",
    count,
    topic
  });
  return batch.items;
}

/**
 * Generate sentiment analysis data
 */
export async function generateSentimentData(
  userId: number,
  count: number,
  topic?: string
): Promise<GeneratedDataItem[]> {
  const batch = await generateDataBatch(userId, {
    type: "sentiment_data",
    count,
    topic
  });
  return batch.items;
}

/**
 * Generate product descriptions
 */
export async function generateProductDescriptions(
  userId: number,
  count: number,
  category?: string
): Promise<GeneratedDataItem[]> {
  const batch = await generateDataBatch(userId, {
    type: "product_descriptions",
    count,
    topic: category
  });
  return batch.items;
}

/**
 * Get all generated data
 */
export function getAllGeneratedData(): GeneratedDataItem[] {
  return [...generatedData];
}

/**
 * Get all data batches
 */
export function getAllDataBatches(): DataBatch[] {
  return [...dataBatches];
}

/**
 * Get data buying platforms
 */
export function getDataBuyingPlatforms(): typeof DATA_BUYING_PLATFORMS {
  return DATA_BUYING_PLATFORMS;
}

/**
 * Get data generation types
 */
export function getDataGenerationTypes(): typeof DATA_GENERATION_TYPES {
  return DATA_GENERATION_TYPES;
}

/**
 * Get data earnings summary
 */
export function getDataEarnings(): typeof dataEarnings {
  return { ...dataEarnings };
}

/**
 * Get data monetization stats
 */
export function getDataMonetizationStats(): {
  totalItems: number;
  totalBatches: number;
  totalValue: number;
  earnings: typeof dataEarnings;
  topPlatforms: Array<{ platform: string; earnings: number }>;
} {
  const platformEarnings = new Map<string, number>();
  
  generatedData.forEach(item => {
    item.submissions.forEach(sub => {
      if (sub.paidAmount) {
        const current = platformEarnings.get(sub.platform) || 0;
        platformEarnings.set(sub.platform, current + sub.paidAmount);
      }
    });
  });

  const topPlatforms = Array.from(platformEarnings.entries())
    .map(([platform, earnings]) => ({ platform, earnings }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  return {
    totalItems: generatedData.length,
    totalBatches: dataBatches.length,
    totalValue: dataBatches.reduce((sum, b) => sum + b.totalValue, 0),
    earnings: { ...dataEarnings },
    topPlatforms
  };
}

// Helper functions

async function generateDataContent(
  dataType: typeof DATA_GENERATION_TYPES[0],
  topic?: string
): Promise<any> {
  const topicStr = topic || "general";

  switch (dataType.type) {
    case "qa_pairs":
      return generateQAContent(topicStr);
    case "sentiment_data":
      return generateSentimentContent(topicStr);
    case "product_descriptions":
      return generateProductContent(topicStr);
    case "conversation_data":
      return generateConversationContent(topicStr);
    case "code_snippets":
      return generateCodeContent(topicStr);
    case "structured_data":
      return generateStructuredContent(topicStr);
    case "entity_data":
      return generateEntityContent(topicStr);
    default:
      return generateTextContent(topicStr);
  }
}

async function generateQAContent(topic: string): Promise<{ question: string; answer: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Generate a question and detailed answer pair for AI training. Return JSON with 'question' and 'answer' fields." },
        { role: "user", content: `Generate a Q&A pair about: ${topic}` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "qa_pair",
          strict: true,
          schema: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" }
            },
            required: ["question", "answer"],
            additionalProperties: false
          }
        }
      }
    });
    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === 'string' ? content : "{}");
  } catch {
    return {
      question: `What is ${topic}?`,
      answer: `${topic} is an important concept that involves various aspects and considerations.`
    };
  }
}

async function generateSentimentContent(topic: string): Promise<{ text: string; sentiment: string; score: number }> {
  const sentiments = ["positive", "negative", "neutral"];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const score = sentiment === "positive" ? 0.7 + Math.random() * 0.3 :
               sentiment === "negative" ? Math.random() * 0.3 :
               0.4 + Math.random() * 0.2;

  return {
    text: `This is a ${sentiment} statement about ${topic}.`,
    sentiment,
    score: Math.round(score * 100) / 100
  };
}

async function generateProductContent(category: string): Promise<{ name: string; description: string; features: string[] }> {
  return {
    name: `Premium ${category} Product`,
    description: `High-quality ${category} product with exceptional features and durability.`,
    features: ["Feature 1", "Feature 2", "Feature 3"]
  };
}

async function generateConversationContent(topic: string): Promise<{ turns: Array<{ role: string; content: string }> }> {
  return {
    turns: [
      { role: "user", content: `Tell me about ${topic}` },
      { role: "assistant", content: `${topic} is a fascinating subject. Let me explain...` },
      { role: "user", content: "Can you give me more details?" },
      { role: "assistant", content: "Of course! Here are the key points..." }
    ]
  };
}

async function generateCodeContent(topic: string): Promise<{ language: string; code: string; description: string }> {
  return {
    language: "javascript",
    code: `// ${topic} implementation\nfunction process${topic.replace(/\s/g, '')}(data) {\n  return data;\n}`,
    description: `A function that processes ${topic} data`
  };
}

async function generateStructuredContent(topic: string): Promise<Record<string, any>> {
  return {
    id: Math.floor(Math.random() * 10000),
    category: topic,
    value: Math.random() * 100,
    timestamp: new Date().toISOString(),
    metadata: { source: "synthetic", quality: "high" }
  };
}

async function generateEntityContent(topic: string): Promise<{ text: string; entities: Array<{ text: string; type: string; start: number; end: number }> }> {
  const text = `The ${topic} company announced new products today.`;
  return {
    text,
    entities: [
      { text: topic, type: "ORG", start: 4, end: 4 + topic.length }
    ]
  };
}

async function generateTextContent(topic: string): Promise<{ text: string }> {
  return {
    text: `This is generated content about ${topic}. It contains relevant information for AI training purposes.`
  };
}

function calculateDataOffer(batch: DataBatch, platform: typeof DATA_BUYING_PLATFORMS[0]): number {
  const baseValue = batch.totalValue;
  const platformMultiplier = platform.payRate.max / 0.50; // Normalize to max rate
  const qualityBonus = batch.items.reduce((sum, item) => sum + item.quality, 0) / batch.items.length;
  
  return Math.round(baseValue * platformMultiplier * qualityBonus * 100) / 100;
}
