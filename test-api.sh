#!/bin/bash

# Test script for AI Sales Messaging API
# Run this after starting the server with `npm run dev`

BASE_URL="http://localhost:3000"

echo "🧪 Testing AI Sales Messaging API"
echo "=================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health check..."
curl -s $BASE_URL/health | jq '.'
echo ""
echo ""

# Test 2: Generate sequence - Professional
echo "2️⃣  Generating sequence (Professional tone)..."
curl -s -X POST $BASE_URL/api/generate-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_url": "https://linkedin.com/in/sarah-anderson",
    "tov_config": {
      "formality": 0.8,
      "warmth": 0.5,
      "directness": 0.8
    },
    "company_context": "Enterprise SaaS platform for sales automation and CRM integration",
    "sequence_length": 3
  }' | jq '.'
echo ""
echo ""

# Test 3: Generate sequence - Casual & Warm
echo "3️⃣  Generating sequence (Casual & Warm tone)..."
curl -s -X POST $BASE_URL/api/generate-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_url": "https://linkedin.com/in/mike-developer",
    "tov_config": {
      "formality": 0.3,
      "warmth": 0.9,
      "directness": 0.5
    },
    "company_context": "Developer tools and APIs for indie hackers and small teams",
    "sequence_length": 2
  }' | jq '.'
echo ""
echo ""

# Test 4: Retrieve a sequence (using ID from previous response)
echo "4️⃣  Retrieving sequence by ID..."
echo "   (Trying sequence_id=1, adjust if needed)"
curl -s $BASE_URL/api/sequences/1 | jq '.'
echo ""
echo ""

# Test 5: Test validation - Invalid URL
echo "5️⃣  Testing validation (should fail - invalid URL)..."
curl -s -X POST $BASE_URL/api/generate-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_url": "https://twitter.com/invalid",
    "tov_config": {
      "formality": 0.7,
      "warmth": 0.6,
      "directness": 0.7
    },
    "company_context": "Test company",
    "sequence_length": 3
  }' | jq '.'
echo ""
echo ""

echo "✅ Test suite completed!"
echo ""
echo "💡 Check your database:"
echo "   psql -d ai_sales_messaging -c 'SELECT id, full_name, company FROM prospects;'"
echo "   psql -d ai_sales_messaging -c 'SELECT id, prospect_id, sequence_length, status FROM message_sequences;'"
