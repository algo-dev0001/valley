import { z } from 'zod';

/**
 * TOV Config schema for validation
 * Parameters are on a 0-1 scale for consistency
 */
export const tovConfigSchema = z.object({
  formality: z.number().min(0).max(1),
  warmth: z.number().min(0).max(1),
  directness: z.number().min(0).max(1),
  // Allow additional parameters for extensibility
}).passthrough();

/**
 * Request schema for /api/generate-sequence endpoint
 */
export const generateSequenceSchema = z.object({
  prospect_url: z.string().url().regex(/linkedin\.com\/in\//i, {
    message: 'Must be a valid LinkedIn profile URL',
  }),
  tov_config: tovConfigSchema,
  company_context: z.string().min(10).max(1000),
  sequence_length: z.number().int().min(1).max(5).default(3),
});

export type GenerateSequenceRequest = z.infer<typeof generateSequenceSchema>;
export type TOVConfig = z.infer<typeof tovConfigSchema>;

/**
 * Message structure in generated sequence
 */
export interface GeneratedMessage {
  order: number;
  content: string;
  thinking_process: string;
  confidence_score: number;
  channel: 'linkedin' | 'email';
  subject?: string; // For email messages
}

/**
 * Prospect profile structure
 */
export interface ProspectProfile {
  linkedin_url: string;
  full_name?: string;
  headline?: string;
  company?: string;
  position?: string;
  location?: string;
  profile_data: Record<string, any>;
  last_analyzed_at?: Date | string;
}

/**
 * Complete response structure
 */
export interface GenerateSequenceResponse {
  sequence_id: number;
  prospect: {
    id: number;
    name: string;
    headline: string;
    company: string;
  };
  messages: GeneratedMessage[];
  analysis: {
    key_insights: string[];
    personalization_opportunities: string[];
    recommended_approach: string;
  };
  overall_confidence: number;
  generation_metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
    processing_time_ms: number;
  };
}
