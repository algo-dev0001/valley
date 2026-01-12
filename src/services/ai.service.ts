import { query } from '../db';
import { TOVConfig, GeneratedMessage, ProspectProfile } from '../types';
import { tovToPromptInstructions, calculateCost, sanitizeInput } from '../utils/helpers';
import OpenAI from 'openai';

/**
 * AI Service for generating personalized message sequences
 * This demonstrates how to structure AI workflows with proper logging,
 * error handling, and cost tracking
 */

// Initialize OpenAI client lazily to ensure env vars are loaded
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface AIGenerationResult {
  messages: GeneratedMessage[];
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
    processing_time_ms: number;
  };
  generation_id: number;
}

/**
 * Build the AI prompt for message generation
 * This is where prompt engineering happens - structure is key for consistent outputs
 */
function buildPrompt(
  prospect: ProspectProfile,
  companyContext: string,
  tovInstructions: string,
  sequenceLength: number
): string {
  const prospectContext = `
Prospect Information:
- Name: ${prospect.full_name || 'Unknown'}
- Title: ${prospect.position || 'Unknown'}
- Company: ${prospect.company || 'Unknown'}
- Headline: ${prospect.headline || 'N/A'}
- About: ${(prospect.profile_data.about as string) || 'N/A'}
- Key Skills: ${(prospect.profile_data.skills as string[])?.join(', ') || 'N/A'}
`.trim();

  const prompt = `
You are an expert sales copywriter creating a personalized outreach sequence.

${prospectContext}

Company Context:
${sanitizeInput(companyContext)}

Tone of Voice Instructions:
${tovInstructions}

Task:
Create a ${sequenceLength}-message LinkedIn outreach sequence. Each message should:
1. Be progressively more detailed (start brief, add value incrementally)
2. Reference specific aspects of the prospect's profile
3. Connect your company's value to their likely pain points
4. Include a clear, low-friction next step

For each message, provide:
- The message content (50-150 words for message 1, up to 200 for follow-ups)
- Your thinking process (why this approach, what you're personalizing)
- A confidence score (0-1) based on personalization quality

Respond ONLY with valid JSON in this exact structure:
{
  "messages": [
    {
      "order": 1,
      "content": "message text here",
      "thinking_process": "your reasoning here",
      "confidence_score": 0.85,
      "channel": "linkedin"
    }
  ],
  "overall_confidence": 0.85
}

Be direct, authentic, and value-focused. Avoid generic sales speak.
`.trim();

  return prompt;
}

/**
 * Call AI API to generate messages
 * Now using real OpenAI API with GPT-4
 */
async function callAI(
  prompt: string,
  _prospectId: number,
  sequenceLength: number
): Promise<{
  response: any;
  tokens_prompt: number;
  tokens_completion: number;
  latency_ms: number;
}> {
  const startTime = Date.now();

  try {
    // Real OpenAI API call
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales copywriter. You create personalized, authentic outreach messages that drive engagement. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(responseText);

    const latency_ms = Date.now() - startTime;

    return {
      response: parsedResponse,
      tokens_prompt: completion.usage?.prompt_tokens || 0,
      tokens_completion: completion.usage?.completion_tokens || 0,
      latency_ms,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback to mock response if API fails
    console.log('Falling back to mock response due to API error');
    
    const mockResponse = {
      messages: Array.from({ length: sequenceLength }, (_, i) => ({
        order: i + 1,
        content: `[FALLBACK] Message ${i + 1}: This is a fallback message due to API error. In production, this would be AI-generated personalized content.`,
        thinking_process: `Fallback message ${i + 1} - API call failed, using mock data`,
        confidence_score: 0.5,
        channel: 'linkedin' as const,
      })),
      overall_confidence: 0.5,
    };

    const latency_ms = Date.now() - startTime;

    return {
      response: mockResponse,
      tokens_prompt: Math.ceil(prompt.length / 4),
      tokens_completion: Math.ceil(JSON.stringify(mockResponse).length / 4),
      latency_ms,
    };
  }
}

/**
 * Generate message sequence with full AI workflow
 * Includes: prompt building, AI call, response parsing, logging, cost tracking
 */
export async function generateMessageSequence(
  prospect: ProspectProfile,
  prospectId: number,
  tov: TOVConfig,
  companyContext: string,
  sequenceLength: number
): Promise<AIGenerationResult> {
  const startTime = Date.now();

  // 1. Convert TOV to prompt instructions
  const tovInstructions = tovToPromptInstructions(tov);

  // 2. Build structured prompt
  const prompt = buildPrompt(prospect, companyContext, tovInstructions, sequenceLength);

  // 3. Call AI API
  const aiResult = await callAI(prompt, prospectId, sequenceLength);

  // 4. Parse and validate response
  const parsedResponse = aiResult.response;
  const messages: GeneratedMessage[] = parsedResponse.messages;

  // 5. Calculate costs
  const model = 'gpt-4o-mini'; // Using GPT-4o-mini for cost efficiency
  const cost_usd = calculateCost(
    aiResult.tokens_prompt,
    aiResult.tokens_completion,
    model
  );

  const processing_time_ms = Date.now() - startTime;

  // 6. Log AI generation to database for tracking
  const generationResult = await query<{ id: number }>(
    `INSERT INTO ai_generations 
     (provider, model, prompt_template, full_prompt, response_raw, response_parsed,
      tokens_prompt, tokens_completion, tokens_total, cost_usd, latency_ms, success)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      'openai',
      model,
      'generate_sequence_v1',
      prompt,
      JSON.stringify(aiResult.response),
      JSON.stringify(messages),
      aiResult.tokens_prompt,
      aiResult.tokens_completion,
      aiResult.tokens_prompt + aiResult.tokens_completion,
      cost_usd,
      aiResult.latency_ms,
      true,
    ]
  );

  return {
    messages,
    metadata: {
      model,
      tokens_used: aiResult.tokens_prompt + aiResult.tokens_completion,
      cost_usd,
      processing_time_ms,
    },
    generation_id: generationResult.rows[0].id,
  };
}

/**
 * Save generated sequence to database
 */
export async function saveMessageSequence(
  prospectId: number,
  messages: GeneratedMessage[],
  companyContext: string,
  overallConfidence: number,
  generationId: number,
  tovConfigId: number | null = null
): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO message_sequences 
     (prospect_id, tov_config_id, company_context, sequence_length, messages, overall_confidence, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      prospectId,
      tovConfigId,
      companyContext,
      messages.length,
      JSON.stringify(messages),
      overallConfidence,
      'generated',
    ]
  );

  const sequenceId = result.rows[0].id;

  // Link AI generation to sequence
  await query(
    'UPDATE ai_generations SET sequence_id = $1 WHERE id = $2',
    [sequenceId, generationId]
  );

  return sequenceId;
}
