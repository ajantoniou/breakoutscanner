#!/bin/bash

# Path to the project directory
PROJECT_DIR="."

# Navigate to the project directory
cd "$PROJECT_DIR" || { echo "Error: Could not navigate to project directory"; exit 1; }

# Check if ts-node is installed
if ! command -v ts-node &> /dev/null; then
    echo "ts-node not found, installing..."
    npm install -g ts-node typescript
fi

# Check if the backtest script exists
if [ ! -f "./scripts/comprehensive-backtest.ts" ]; then
    echo "Error: Backtest script not found at ./scripts/comprehensive-backtest.ts"
    exit 1
fi

echo "===========================================" 
echo "      Running Comprehensive Backtest       "
echo "===========================================" 

# Run the backtest using ts-node
ts-node ./scripts/comprehensive-backtest.ts

# Check if the backtest was successful
if [ $? -eq 0 ]; then
    echo "Backtest completed successfully!"
    echo "Results can be found in the backtest-results directory"
    
    # Check if the results directory exists
    if [ -d "./backtest-results" ]; then
        # List the most recent results files
        echo ""
        echo "Most recent result files:"
        ls -lt ./backtest-results | head -n 10
    else
        echo "No results directory found."
    fi
else
    echo "Backtest failed with an error."
fi 