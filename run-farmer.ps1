# MicroMind Farming Bot Runner
# This script ensures dependencies are met and starts the farming bot.

Write-Host "=== MicroMind Farming Bot Starting ===" -ForegroundColor Cyan

# Check for node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

# Run the farmer using the npm script
Write-Host "Launching farmer..." -ForegroundColor Green
npm run divine
