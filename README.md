# AI Sales Messaging API

A production-minded REST API for generating personalized LinkedIn outreach sequences using AI. Built as a time-boxed backend engineering assessment demonstrating system design, data modeling, and AI workflow integration.

## 🎯 What This Is

A clean, minimal backend that:
- Takes LinkedIn prospect URLs and generates personalized messaging sequences
- Uses PostgreSQL JSONB for flexible AI workflow data
- Demonstrates structured AI prompting with cost/token tracking
- Focuses on maintainability and clear design decisions over completeness

**This is intentionally scoped for a 4-5 hour assessment.** Production shortcuts are documented.

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express 4
- **Database**: PostgreSQL 14+ (with JSONB support)
- **Validation**: Zod for runtime type safety
- **AI**: Mock responses (structure ready for OpenAI/Anthropic)

### Project Structure
```
src/
├── routes/          # API endpoints (thin controllers)
│   └── api.routes.ts
├── services/        # Business logic layer
│   ├── ai.service.ts       # AI generation workflow
│   └── prospect.service.ts # Prospect data management
├── db/              # Database utilities
│   ├── index.ts     # Connection pool & query wrapper
│   └── migrate.ts   # Simple migration runner
├── utils/           # Pure utility functions
│   └── helpers.ts   # TOV conversion, cost calc, etc.
├── types/           # TypeScript types & Zod schemas
│   └── index.ts
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## 📊 Database Schema

### Design Decisions

**1. Prospects Table**
- Caches LinkedIn profile data with 24hr TTL
- Uses JSONB `profile_data` for flexible scraping results (skills, experience, etc.)
- Stores AI `analysis` as JSONB for extensibility
- **Why**: Reduces external API calls; JSONB allows schema evolution without migrations

**2. TOV Configs Table**
- Normalizes tone-of-voice parameters (0-1 scale for consistency)
- Caches AI instructions to avoid regenerating prompts
- Supports additional params via JSONB
- **Why**: Makes TOV reusable across prospects; deterministic parameter handling

**3. Message Sequences Table**
- Stores generated messages as JSONB array (order, content, confidence, thinking)
- Links to prospect and TOV config for traceability
- Tracks status for workflow states (generated → reviewed → approved → sent)
- **Why**: JSONB handles variable message counts; preserves full AI reasoning

**4. AI Generations Table**
- Logs every AI API call with full request/response
- Tracks tokens, cost, latency, errors for monitoring
- Enables cost analysis and prompt optimization
- **Why**: Essential for production AI systems; debugging and cost control

### Indexes
- B-tree on foreign keys and timestamps for filtering
- GIN indexes on JSONB columns for efficient querying
- Unique constraint on `linkedin_url` to prevent duplicates

## 🤖 AI Integration Approach

### Prompt Engineering Strategy

**Structured Output Format**: We request JSON responses with a fixed schema:
```json
{
  "messages": [
    {
      "order": 1,
      "content": "...",
      "thinking_process": "...",
      "confidence_score": 0.85,
      "channel": "linkedin"
    }
  ],
  "overall_confidence": 0.85
}
```

**TOV Parameter Translation**: Numerical scales (0-1) convert to natural language:
- `formality: 0.8` → "Use formal, polished language. Avoid contractions..."
- `warmth: 0.6` → "Show genuine interest... Include light personal touches..."
- `directness: 0.7` → "Be clear about your purpose, but not pushy..."

**Why this works**:
- Consistent structure enables reliable parsing
- Thinking process aids debugging and transparency
- Confidence scores help filtering low-quality outputs
- Numerical TOV is programmatic; text instructions are AI-friendly

### Error Handling & Fallbacks

1. **Validation**: Zod schemas catch bad inputs before AI calls
2. **Retry Logic**: (TODO) Would add exponential backoff for rate limits
3. **Cost Limits**: (TODO) Would add per-request budget caps
4. **Graceful Degradation**: Mock responses work without API keys for testing

### Why Mock AI for Assessment?

The AI call structure is production-ready (prompt building, token tracking, response parsing), but uses mock responses to:
- Focus reviewer attention on system design over API integration
- Allow testing without API keys or costs
- Demonstrate proper logging/observability patterns

**Swapping to real AI**: Change ~10 lines in `ai.service.ts` (documented in code comments).

## 🚀 API Design

### Core Endpoint

**POST `/api/generate-sequence`**

Request:
```json
{
  "prospect_url": "https://linkedin.com/in/john-doe",
  "tov_config": {
    "formality": 0.8,
    "warmth": 0.6,
    "directness": 0.7
  },
  "company_context": "We help SaaS companies automate sales outreach",
  "sequence_length": 3
}
```

Response:
```json
{
  "sequence_id": 123,
  "prospect": {
    "id": 456,
    "name": "John Doe",
    "headline": "VP of Sales at TechCorp",
    "company": "TechCorp"
  },
  "messages": [
    {
      "order": 1,
      "content": "Hi John, noticed your work at TechCorp...",
      "thinking_process": "Leading with role-specific value...",
      "confidence_score": 0.87,
      "channel": "linkedin"
    }
  ],
  "analysis": {
    "key_insights": ["Senior decision-maker with budget authority"],
    "personalization_opportunities": ["Reference TechCorp's recent growth"],
    "recommended_approach": "Lead with ROI-focused value proposition"
  },
  "overall_confidence": 0.85,
  "generation_metadata": {
    "model": "gpt-3.5-turbo",
    "tokens_used": 842,
    "cost_usd": 0.001263,
    "processing_time_ms": 1547
  }
}
```

### Design Choices

1. **Validation First**: Reject bad requests before expensive operations
2. **Caching**: 24hr TTL on prospect data reduces scraping costs
3. **Comprehensive Responses**: Include AI reasoning for transparency
4. **Cost Visibility**: Every response shows token usage and cost
5. **Idempotency**: (TODO) Would add request IDs to prevent duplicate generations

**GET `/api/sequences/:id`** - Retrieve previously generated sequence

**GET `/health`** - Database connectivity check (for load balancers)

## 🛠️ Setup & Running

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up database**
```bash
# Create database
createdb ai_sales_messaging

# Copy environment file
cp .env.example .env

# Edit .env with your DATABASE_URL
# Example: postgresql://postgres:password@localhost:5432/ai_sales_messaging
```

3. **Run migrations**
```bash
npm run build
npm run db:migrate
```

4. **Start development server**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Testing the API

**Health Check**:
```bash
curl http://localhost:3000/health
```

**Generate Sequence**:
```bash
curl -X POST http://localhost:3000/api/generate-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_url": "https://linkedin.com/in/john-doe",
    "tov_config": {
      "formality": 0.7,
      "warmth": 0.6,
      "directness": 0.7
    },
    "company_context": "We help SaaS companies automate sales outreach",
    "sequence_length": 3
  }'
```

**Retrieve Sequence**:
```bash
curl http://localhost:3000/api/sequences/1
```

## 🚢 Deployment

### Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)

Optional (for real AI):
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key

### Production Considerations

**What's Production-Ready**:
✅ Database connection pooling with error handling
✅ Graceful shutdown (SIGTERM/SIGINT)
✅ Request logging and error tracking
✅ Input validation and sanitization
✅ Cost tracking per generation
✅ Health check endpoint for monitoring

**What's Simplified** (with comments on what to add):
- **Auth**: No authentication (add JWT middleware)
- **Rate Limiting**: No rate limits (add express-rate-limit)
- **Caching**: Simple TTL (add Redis for distributed cache)
- **Migrations**: Basic runner (use Flyway/node-pg-migrate)
- **LinkedIn Scraping**: Mock data (integrate real scraper/API)
- **AI Retries**: No backoff (add retry logic with exponential backoff)
- **Observability**: Console logs (add structured logging + APM)
- **Testing**: No tests (add Jest + integration tests)

### Deployment Options

**Railway** (Recommended for quick demo):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway add  # Add PostgreSQL
railway up
```

**Render**:
- Connect GitHub repo
- Add PostgreSQL database
- Set environment variables
- Deploy

**Heroku**:
```bash
heroku create
heroku addons:create heroku-postgresql
git push heroku main
```

## 🔄 What I'd Improve with More Time

### 1. Real LinkedIn Scraping
**Current**: Mock profile data
**Production**: Integrate Scrapin.io, Bright Data, or LinkedIn API
**Tradeoff**: Mock data keeps assessment focused on AI workflow

### 2. Actual AI Integration
**Current**: Mock AI responses
**Production**: OpenAI GPT-4 or Anthropic Claude with structured outputs
**Tradeoff**: Avoids API costs during review; structure is ready

### 3. Better Prompt Engineering
**Current**: Single-shot generation
**Production**: 
- Chain-of-thought prompting for better reasoning
- Few-shot examples for consistency
- Separate profile analysis + message generation steps
- A/B test different prompt templates

### 4. Caching & Performance
**Current**: Simple 24hr TTL in database
**Production**: 
- Redis for prospect profiles
- Cache AI generation by (prospect + TOV) hash
- Rate limit by user/API key
- Background job queue for slow operations

### 5. Observability
**Current**: Console logs + database logging
**Production**:
- Structured logging (Winston/Pino)
- APM (DataDog, New Relic)
- Error tracking (Sentry)
- Metrics dashboard (tokens/day, cost/user, success rates)

### 6. Testing
**Current**: Manual testing
**Production**:
- Unit tests for utilities (TOV conversion, cost calc)
- Integration tests for API endpoints
- Mock AI responses for consistent tests
- Load testing for scaling

### 7. Data Validation & Security
**Current**: Basic Zod validation, input sanitization
**Production**:
- Rate limiting per IP/user
- API key authentication
- CORS configuration
- SQL injection protection (parameterized queries already implemented)
- Prompt injection detection

### 8. AI Cost Optimization
**Current**: Log costs per request
**Production**:
- Set budget caps per user
- Cache common generations
- Use cheaper models for initial draft + expensive model for final polish
- Implement streaming responses for faster UX

## 💡 Alternative Approaches Considered

### 1. Using Prisma vs Raw SQL
**Chose**: node-postgres (pg)
**Why**: More control over JSONB queries; less abstraction for assessment review
**Tradeoff**: Would use Prisma in larger teams for type safety + migrations

### 2. Microservices Architecture
**Chose**: Monolithic Express app
**Why**: Overkill for assessment scope; easier to reason about
**When to split**: If scraping, AI, and API scale independently

### 3. Storing Messages as Separate Rows
**Chose**: JSONB array in single column
**Why**: Messages are logically a single sequence; JSONB is PostgreSQL-native
**Tradeoff**: Separate `messages` table would allow per-message analytics

### 4. Synchronous vs Async Generation
**Chose**: Synchronous (wait for AI response)
**Why**: Simpler for assessment; most sequences generate in <3 seconds
**When to queue**: If sequences take >5 seconds or need batch processing

## 📚 Key Learnings & Patterns

### 1. AI Workflow Pattern
```
Input Validation → Data Fetching → Analysis → Prompt Engineering 
→ AI Call → Response Parsing → Database Logging → Return Result
```
Each step is isolated, testable, and loggable.

### 2. TOV as Data
Treating tone-of-voice as structured data (not just prompts) enables:
- Reusability across prospects
- A/B testing different configurations
- Analytics on which TOV works best

### 3. Observability from Day 1
Logging AI calls with full context (prompt, response, tokens, cost) is essential:
- Debug failing generations
- Optimize prompts based on token usage
- Track costs before they spiral

### 4. JSONB for AI Workflows
PostgreSQL JSONB is ideal for:
- Variable-length AI outputs
- Schema evolution (add new fields without migrations)
- Queryable JSON (vs text blob)

## 🤝 Technical Discussion Topics

Questions I'd love to explore in follow-up:

1. **Scaling AI Workflows**: When to cache, queue, or stream?
2. **Prompt Versioning**: How to track/rollback prompt changes?
3. **Cost vs Quality**: Tradeoffs between models (GPT-4 vs 3.5)?
4. **Determinism**: How to make AI outputs more predictable?
5. **Evaluation**: How to measure message quality programmatically?
6. **Multi-tenancy**: How to isolate customers in this schema?

## 📝 License

MIT (assessment project)

---

**Time Spent**: ~4 hours (setup, database design, core API, AI service, documentation)

**Focus Areas**:
- Clean architecture with separation of concerns
- Production-minded error handling and logging
- Thoughtful data modeling for AI workflows
- Clear documentation of tradeoffs and future improvements
