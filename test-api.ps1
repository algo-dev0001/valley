# Test script for AI Sales Messaging API (Windows PowerShell)
# Run this after starting the server with `npm run dev`

$BASE_URL = "http://localhost:3000"

Write-Host "🧪 Testing AI Sales Messaging API" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing health check..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$response | ConvertTo-Json
Write-Host ""

# Test 2: Generate sequence - Professional
Write-Host "2️⃣  Generating sequence (Professional tone)..." -ForegroundColor Yellow
$body = @{
    prospect_url = "https://linkedin.com/in/sarah-anderson"
    tov_config = @{
        formality = 0.8
        warmth = 0.5
        directness = 0.8
    }
    company_context = "Enterprise SaaS platform for sales automation and CRM integration"
    sequence_length = 3
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/generate-sequence" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10
Write-Host ""

# Test 3: Generate sequence - Casual & Warm
Write-Host "3️⃣  Generating sequence (Casual & Warm tone)..." -ForegroundColor Yellow
$body = @{
    prospect_url = "https://linkedin.com/in/mike-developer"
    tov_config = @{
        formality = 0.3
        warmth = 0.9
        directness = 0.5
    }
    company_context = "Developer tools and APIs for indie hackers and small teams"
    sequence_length = 2
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/generate-sequence" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10
Write-Host ""

# Test 4: Retrieve a sequence
Write-Host "4️⃣  Retrieving sequence by ID..." -ForegroundColor Yellow
Write-Host "   (Trying sequence_id=1, adjust if needed)" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/sequences/1" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "   Sequence not found (may not exist yet)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Test validation
Write-Host "5️⃣  Testing validation (should fail - invalid URL)..." -ForegroundColor Yellow
$body = @{
    prospect_url = "https://twitter.com/invalid"
    tov_config = @{
        formality = 0.7
        warmth = 0.6
        directness = 0.7
    }
    company_context = "Test company"
    sequence_length = 3
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/generate-sequence" -Method Post -Body $body -ContentType "application/json"
} catch {
    $error = $_.ErrorDetails.Message | ConvertFrom-Json
    $error | ConvertTo-Json
}
Write-Host ""

Write-Host "✅ Test suite completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Check your database with pgAdmin or psql" -ForegroundColor Cyan
