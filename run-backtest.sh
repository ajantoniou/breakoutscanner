#!/bin/bash

# Run Comprehensive Backtesting Script
# This script executes the comprehensive backtesting across various assets

# Set environment variables
export NODE_ENV=development

# Check if TypeScript is installed
if ! command -v ts-node &> /dev/null; then
  echo "Installing ts-node..."
  npm install -g ts-node typescript
fi

# Create backtest-results directory if it doesn't exist
mkdir -p backtest-results

# Run the backtesting script
echo "Starting comprehensive backtesting..."
ts-node scripts/comprehensive-backtest.ts

# Generate summary report
echo "Generating summary report..."
echo "Comprehensive Backtesting Summary" > backtest-results/summary-report.md
echo "===============================" >> backtest-results/summary-report.md
echo "" >> backtest-results/summary-report.md
echo "## Overview" >> backtest-results/summary-report.md
echo "This report summarizes the results of comprehensive backtesting across various assets, timeframes, and market conditions." >> backtest-results/summary-report.md
echo "" >> backtest-results/summary-report.md

# Add overall performance metrics
echo "## Overall Performance" >> backtest-results/summary-report.md
if [ -f backtest-results/overall-summary.txt ]; then
  cat backtest-results/overall-summary.txt >> backtest-results/summary-report.md
fi

# Add optimization results
echo "" >> backtest-results/summary-report.md
echo "## Optimization Results" >> backtest-results/summary-report.md
echo "The following parameters were optimized based on backtest results:" >> backtest-results/summary-report.md
echo "" >> backtest-results/summary-report.md
echo "- Pattern detection parameters" >> backtest-results/summary-report.md
echo "- Entry and exit parameters" >> backtest-results/summary-report.md
echo "- Scanner parameters" >> backtest-results/summary-report.md
echo "" >> backtest-results/summary-report.md
echo "See optimization-results.json for detailed optimization parameters." >> backtest-results/summary-report.md

echo "Backtesting completed! Results are available in the backtest-results directory."
