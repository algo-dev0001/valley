import { TOVConfig } from '../types';

/**
 * Convert numerical TOV parameters to natural language instructions for AI
 * This is where we translate the 0-1 scale into meaningful prompt guidance
 */
export function tovToPromptInstructions(tov: TOVConfig): string {
  const instructions: string[] = [];

  // Formality (0 = casual, 1 = very formal)
  if (tov.formality <= 0.3) {
    instructions.push('Use a casual, conversational tone. Feel free to use contractions and informal language.');
  } else if (tov.formality <= 0.7) {
    instructions.push('Maintain a professional yet approachable tone. Balance formality with friendliness.');
  } else {
    instructions.push('Use formal, polished language. Avoid contractions and maintain professional distance.');
  }

  // Warmth (0 = cold/transactional, 1 = very warm/personal)
  if (tov.warmth <= 0.3) {
    instructions.push('Keep it brief and transactional. Focus on facts and value proposition.');
  } else if (tov.warmth <= 0.7) {
    instructions.push('Show genuine interest in the prospect. Include light personal touches while staying professional.');
  } else {
    instructions.push('Be warm and personable. Build rapport with empathy and authentic connection.');
  }

  // Directness (0 = subtle/soft, 1 = very direct)
  if (tov.directness <= 0.3) {
    instructions.push('Be subtle and consultative. Ease into the ask gradually.');
  } else if (tov.directness <= 0.7) {
    instructions.push('Be clear about your purpose, but not pushy. Balance directness with tact.');
  } else {
    instructions.push('Be direct and straightforward. State your purpose clearly upfront.');
  }

  return instructions.join(' ');
}

/**
 * Extract LinkedIn username from various LinkedIn URL formats
 */
export function extractLinkedInUsername(url: string): string {
  const patterns = [
    /linkedin\.com\/in\/([^\/\?]+)/i,
    /linkedin\.com\/pub\/([^\/\?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Invalid LinkedIn URL format');
}

/**
 * Calculate cost from token usage
 * Prices updated as of January 2026
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // Pricing as of January 2026
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
    'gpt-4o': { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
    'gpt-4o-mini': { prompt: 0.00015 / 1000, completion: 0.0006 / 1000 },
    'gpt-3.5-turbo': { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
    'claude-3-opus': { prompt: 0.015 / 1000, completion: 0.075 / 1000 },
    'claude-3-sonnet': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  const cost =
    promptTokens * modelPricing.prompt +
    completionTokens * modelPricing.completion;

  return Number(cost.toFixed(6));
}

/**
 * Sanitize user input to prevent prompt injection
 * Simple version - in production, use more sophisticated techniques
 */
export function sanitizeInput(text: string): string {
  // Remove potentially problematic patterns
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\{|\}/g, '') // Remove curly braces
    .replace(/\[SYSTEM\]|\[USER\]|\[ASSISTANT\]/gi, '') // Remove role markers
    .trim();
}

/**
 * Format error messages for API responses
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  details?: string;
} {
  if (error instanceof Error) {
    return {
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  return { error: 'An unexpected error occurred' };
}
