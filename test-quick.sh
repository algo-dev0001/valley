#!/bin/bash

# Simple test without interrupting the server

echo "Testing AI Sales Messaging API with Real OpenAI..."
echo ""

# Wait for server to be ready
sleep 2

# Test the API
echo "Generating sequence with real OpenAI API..."
curl -s -X POST http://localhost:3000/api/generate-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_url": "https://linkedin.com/in/john-smith",
    "tov_config": {
      "formality": 0.7,
      "warmth": 0.6,
      "directness": 0.7
    },
    "company_context": "We help SaaS companies automate their sales outreach with AI-powered personalization",
    "sequence_length": 3
  }' | python -m json.tool

echo ""
echo "Test complete!"
