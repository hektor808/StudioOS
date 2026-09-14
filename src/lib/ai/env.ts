import "server-only";

export type OpenAIChatModel = "gpt-4.1-mini" | "gpt-4.1" | "gpt-4o-mini";

export type OpenAIConfig = {
  apiKey: string;
  chatModel: OpenAIChatModel;
};

// The embedding model is intentionally not configurable: veo_documents stores
// fixed 1,536-dimensional text-embedding-3-small vectors.
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const OPENAI_EMBEDDING_DIMENSIONS = 1536;

const DEFAULT_CHAT_MODEL: OpenAIChatModel = "gpt-4.1-mini";
const ALLOWED_CHAT_MODELS: ReadonlySet<string> = new Set<OpenAIChatModel>([
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
]);

export class OpenAIConfigError extends Error {
  constructor() {
    super("VEO AI is not configured.");
    this.name = "OpenAIConfigError";
  }
}

export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenAIConfigError();
  }

  const requestedModel = process.env.OPENAI_CHAT_MODEL?.trim();
  const chatModel: OpenAIChatModel =
    requestedModel && ALLOWED_CHAT_MODELS.has(requestedModel)
      ? (requestedModel as OpenAIChatModel)
      : DEFAULT_CHAT_MODEL;

  return { apiKey, chatModel };
}
