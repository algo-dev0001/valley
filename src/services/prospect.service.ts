import { query } from '../db';
import { ProspectProfile } from '../types';
import { extractLinkedInUsername } from '../utils/helpers';

/**
 * Mock LinkedIn scraping service
 * In production, this would call a real scraping service or LinkedIn API
 * For this assessment, we'll generate realistic mock data
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<Partial<ProspectProfile>> {
  const username = extractLinkedInUsername(linkedinUrl);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock profile data - in production, this comes from real scraping
  // We're intentionally keeping this simple to focus on the AI workflow
  return {
    linkedin_url: linkedinUrl,
    full_name: `${username.charAt(0).toUpperCase()}${username.slice(1).replace(/-/g, ' ')}`,
    headline: 'VP of Sales at TechCorp',
    company: 'TechCorp',
    position: 'VP of Sales',
    location: 'San Francisco, CA',
    profile_data: {
      about: 'Experienced sales leader with 10+ years in B2B SaaS. Passionate about building high-performing teams.',
      experience: [
        {
          title: 'VP of Sales',
          company: 'TechCorp',
          duration: '2020 - Present',
          description: 'Leading a team of 15 sales professionals',
        },
        {
          title: 'Sales Director',
          company: 'PreviousCorp',
          duration: '2018 - 2020',
          description: 'Managed enterprise sales team',
        },
      ],
      skills: ['Sales Leadership', 'B2B Sales', 'SaaS', 'Team Building', 'Strategy'],
      education: [
        {
          school: 'University of California',
          degree: 'MBA',
          field: 'Business Administration',
        },
      ],
    },
  };
}

/**
 * Get or create prospect from database
 * If prospect exists and was recently analyzed, return cached data
 * Otherwise, scrape fresh data
 */
export async function getOrCreateProspect(
  linkedinUrl: string
): Promise<{ id: number; profile: ProspectProfile; is_cached: boolean }> {
  // Check if prospect exists
  const existingResult = await query<ProspectProfile & { id: number }>(
    'SELECT * FROM prospects WHERE linkedin_url = $1',
    [linkedinUrl]
  );

  const CACHE_TTL_HOURS = 24;
  const now = new Date();

  if (existingResult.rows.length > 0) {
    const prospect = existingResult.rows[0];
    const lastAnalyzed = prospect.last_analyzed_at
      ? new Date(prospect.last_analyzed_at)
      : null;

    // Use cache if analyzed within TTL
    if (
      lastAnalyzed &&
      now.getTime() - lastAnalyzed.getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000
    ) {
      return {
        id: prospect.id,
        profile: prospect,
        is_cached: true,
      };
    }
  }

  // Scrape fresh data
  const scrapedData = await scrapeLinkedInProfile(linkedinUrl);

  if (existingResult.rows.length > 0) {
    // Update existing prospect
    const updateResult = await query<ProspectProfile & { id: number }>(
      `UPDATE prospects 
       SET full_name = $1, headline = $2, company = $3, position = $4, 
           location = $5, profile_data = $6, updated_at = NOW(), last_analyzed_at = NOW()
       WHERE linkedin_url = $7
       RETURNING *`,
      [
        scrapedData.full_name,
        scrapedData.headline,
        scrapedData.company,
        scrapedData.position,
        scrapedData.location,
        JSON.stringify(scrapedData.profile_data),
        linkedinUrl,
      ]
    );

    return {
      id: updateResult.rows[0].id,
      profile: updateResult.rows[0],
      is_cached: false,
    };
  } else {
    // Create new prospect
    const insertResult = await query<ProspectProfile & { id: number }>(
      `INSERT INTO prospects 
       (linkedin_url, full_name, headline, company, position, location, profile_data, last_analyzed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        scrapedData.linkedin_url,
        scrapedData.full_name,
        scrapedData.headline,
        scrapedData.company,
        scrapedData.position,
        scrapedData.location,
        JSON.stringify(scrapedData.profile_data),
      ]
    );

    return {
      id: insertResult.rows[0].id,
      profile: insertResult.rows[0],
      is_cached: false,
    };
  }
}

/**
 * Analyze prospect profile and extract key insights
 * This would typically use AI, but we'll keep it deterministic for the assessment
 * to focus on the message generation AI workflow
 */
export function analyzeProspect(profile: ProspectProfile): {
  key_insights: string[];
  personalization_opportunities: string[];
  recommended_approach: string;
} {
  const insights: string[] = [];
  const opportunities: string[] = [];

  // Extract insights from profile
  if (profile.position?.toLowerCase().includes('vp') || 
      profile.position?.toLowerCase().includes('director')) {
    insights.push('Senior decision-maker with budget authority');
    opportunities.push('Emphasize ROI and strategic value');
  }

  if (profile.company) {
    insights.push(`Currently at ${profile.company}`);
    opportunities.push(`Research ${profile.company} recent news for timely context`);
  }

  if (profile.headline) {
    insights.push(`Professional focus: ${profile.headline}`);
  }

  // Default opportunities
  opportunities.push('Reference specific experience or achievements');
  opportunities.push('Connect company context to their current role');

  const approach =
    insights.length > 0
      ? 'Lead with relevant value proposition based on seniority and role'
      : 'Take consultative approach to understand needs first';

  return {
    key_insights: insights,
    personalization_opportunities: opportunities,
    recommended_approach: approach,
  };
}
