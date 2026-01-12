-- Database Schema for AI Sales Messaging System
-- Optimized for AI workflow tracking, JSONB flexibility, and production use

-- Prospects: LinkedIn profile data and analysis
CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    linkedin_url TEXT UNIQUE NOT NULL,
    
    -- Core profile data
    full_name TEXT,
    headline TEXT,
    company TEXT,
    position TEXT,
    location TEXT,
    
    -- Rich profile data stored as JSONB for flexibility
    -- Contains: skills, experience, education, about, etc.
    profile_data JSONB DEFAULT '{}'::jsonb,
    
    -- AI-generated analysis
    analysis JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_analyzed_at TIMESTAMP
);

-- TOV (Tone of Voice) Configurations
CREATE TABLE IF NOT EXISTS tov_configs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- TOV parameters (0.0 - 1.0 scale)
    formality DECIMAL(3,2) CHECK (formality >= 0 AND formality <= 1),
    warmth DECIMAL(3,2) CHECK (warmth >= 0 AND warmth <= 1),
    directness DECIMAL(3,2) CHECK (directness >= 0 AND directness <= 1),
    
    -- Additional TOV parameters stored flexibly
    -- e.g. humor, urgency, personalization_level
    additional_params JSONB DEFAULT '{}'::jsonb,
    
    -- Derived AI instructions (cached for efficiency)
    ai_instructions TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Message Sequences: Generated campaigns
CREATE TABLE IF NOT EXISTS message_sequences (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
    tov_config_id INTEGER REFERENCES tov_configs(id) ON DELETE SET NULL,
    
    -- Generation context
    company_context TEXT NOT NULL,
    sequence_length INTEGER NOT NULL CHECK (sequence_length > 0 AND sequence_length <= 10),
    
    -- Generated messages array with metadata
    -- Each message: {order, content, thinking_process, confidence_score, channel}
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Overall sequence metadata
    overall_confidence DECIMAL(3,2),
    generation_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status tracking
    status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'approved', 'sent')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Generations: Track all AI interactions for monitoring and cost management
CREATE TABLE IF NOT EXISTS ai_generations (
    id SERIAL PRIMARY KEY,
    sequence_id INTEGER REFERENCES message_sequences(id) ON DELETE CASCADE,
    
    -- AI provider details
    provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
    model TEXT NOT NULL,
    
    -- Request details
    prompt_template TEXT NOT NULL,
    prompt_variables JSONB DEFAULT '{}'::jsonb,
    full_prompt TEXT,
    
    -- Response details
    response_raw JSONB NOT NULL, -- Full API response
    response_parsed JSONB, -- Extracted structured data
    
    -- Performance metrics
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,
    cost_usd DECIMAL(10,6),
    latency_ms INTEGER,
    
    -- Error handling
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prospects_linkedin_url ON prospects(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_message_sequences_prospect_id ON message_sequences(prospect_id);
CREATE INDEX IF NOT EXISTS idx_message_sequences_created_at ON message_sequences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_sequence_id ON ai_generations(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- JSONB indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prospects_profile_data ON prospects USING GIN(profile_data);
CREATE INDEX IF NOT EXISTS idx_message_sequences_messages ON message_sequences USING GIN(messages);

-- Insert a default TOV config for testing
INSERT INTO tov_configs (name, formality, warmth, directness, ai_instructions)
VALUES (
    'Professional & Friendly',
    0.7,
    0.6,
    0.7,
    'Write in a professional yet approachable tone. Be respectful and formal, but warm and personable. Get to the point clearly without being abrupt.'
) ON CONFLICT DO NOTHING;
