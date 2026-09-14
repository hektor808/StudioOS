import "server-only";

import OpenAI from "openai";

import { getOpenAIConfig } from "./env";

// Single server-only OpenAI boundary. Never import this module from UI code and
// never enable dangerouslyAllowBrowser; all provider calls happen in Route
// Handlers or server-only libraries with finite timeouts and stable errors.
export function getOpenAIClient(): OpenAI {
  const { apiKey } = getOpenAIConfig();
  return new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
}
