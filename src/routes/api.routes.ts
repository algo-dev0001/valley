import { Router, Request, Response } from 'express';
import { generateSequenceSchema } from '../types';
import { getOrCreateProspect, analyzeProspect } from '../services/prospect.service';
import { generateMessageSequence, saveMessageSequence } from '../services/ai.service';
import { formatErrorResponse } from '../utils/helpers';

const router = Router();

/**
 * POST /api/generate-sequence
 * 
 * Core endpoint: Generate personalized messaging sequence for a LinkedIn prospect
 * 
 * Flow:
 * 1. Validate request
 * 2. Get/scrape prospect data
 * 3. Analyze prospect profile
 * 4. Generate AI messages with TOV
 * 5. Save to database
 * 6. Return structured response
 */
router.post('/generate-sequence', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // 1. Validate request body
    const validationResult = generateSequenceSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const { prospect_url, tov_config, company_context, sequence_length } =
      validationResult.data;

    console.log(`Generating sequence for: ${prospect_url}`);

    // 2. Get or create prospect (with caching)
    const { id: prospectId, profile, is_cached } = await getOrCreateProspect(
      prospect_url
    );

    console.log(
      `Prospect ${is_cached ? 'retrieved from cache' : 'scraped fresh'}: ${profile.full_name}`
    );

    // 3. Analyze prospect profile
    const analysis = analyzeProspect(profile);

    // 4. Generate message sequence using AI
    const aiResult = await generateMessageSequence(
      profile,
      prospectId,
      tov_config,
      company_context,
      sequence_length
    );

    console.log(
      `Generated ${aiResult.messages.length} messages (${aiResult.metadata.tokens_used} tokens, $${aiResult.metadata.cost_usd})`
    );

    // 5. Calculate overall confidence from messages
    const overallConfidence =
      aiResult.messages.reduce((sum, msg) => sum + msg.confidence_score, 0) /
      aiResult.messages.length;

    // 6. Save sequence to database
    const sequenceId = await saveMessageSequence(
      prospectId,
      aiResult.messages,
      company_context,
      overallConfidence,
      aiResult.generation_id
    );

    const processingTime = Date.now() - startTime;

    // 7. Return comprehensive response
    return res.status(200).json({
      sequence_id: sequenceId,
      prospect: {
        id: prospectId,
        name: profile.full_name || 'Unknown',
        headline: profile.headline || 'N/A',
        company: profile.company || 'N/A',
      },
      messages: aiResult.messages,
      analysis,
      overall_confidence: Number(overallConfidence.toFixed(2)),
      generation_metadata: {
        ...aiResult.metadata,
        processing_time_ms: processingTime,
      },
    });
  } catch (error) {
    console.error('Error generating sequence:', error);
    
    const errorResponse = formatErrorResponse(error);
    return res.status(500).json({
      error: 'Failed to generate sequence',
      details: errorResponse.error,
    });
  }
});

/**
 * GET /api/sequences/:id
 * 
 * Retrieve a previously generated sequence
 */
router.get('/sequences/:id', async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id, 10);

    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: 'Invalid sequence ID' });
    }

    const { query } = await import('../db');
    
    const result = await query(
      `SELECT 
        ms.*,
        p.full_name, p.headline, p.company,
        ag.model, ag.tokens_total, ag.cost_usd
       FROM message_sequences ms
       JOIN prospects p ON ms.prospect_id = p.id
       LEFT JOIN ai_generations ag ON ag.sequence_id = ms.id
       WHERE ms.id = $1`,
      [sequenceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const sequence = result.rows[0];

    return res.status(200).json({
      sequence_id: sequence.id,
      prospect: {
        name: sequence.full_name,
        headline: sequence.headline,
        company: sequence.company,
      },
      messages: sequence.messages,
      overall_confidence: sequence.overall_confidence,
      status: sequence.status,
      created_at: sequence.created_at,
      generation_metadata: {
        model: sequence.model,
        tokens_used: sequence.tokens_total,
        cost_usd: sequence.cost_usd,
      },
    });
  } catch (error) {
    console.error('Error retrieving sequence:', error);
    return res.status(500).json(formatErrorResponse(error));
  }
});

export default router;
