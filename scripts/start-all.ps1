# Vynk Social Platform - Run Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   Starting Vynk Social Platform (Phase 1)     " -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Cyan

$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

# 1. Run tests first
Write-Host "`n[1/3] Running Automated Test Suite..." -ForegroundColor Yellow
cd backend
npx tsx --test tests/phase1.test.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tests failed. Aborting startup." -ForegroundColor Red
    exit 1
}
Write-Host "All Phase 1 tests passed!" -ForegroundColor Green

# 2. Seed database
Write-Host "`n[2/3] Seeding Initial State..." -ForegroundColor Yellow
npx tsx src/db/seed.ts

# 3. Instructions
Write-Host "`n[3/3] Ready to Launch!" -ForegroundColor Green
Write-Host "To start the backend:  cd backend && npx tsx src/server.ts" -ForegroundColor Cyan
Write-Host "To start the frontend: cd frontend && npm run dev" -ForegroundColor Cyan
cd ..
