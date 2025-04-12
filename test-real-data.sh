#!/bin/bash

# Test script for real market data verification
echo "Starting real market data test..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Create test directory
mkdir -p ./test-results

# Run the test script
echo "Running real-time data verification test..."
node ./src/tests/realTimeDataTest.js > ./test-results/data-accuracy-test.log

# Display results
echo "Test completed. Results saved to ./test-results/data-accuracy-test.log"
echo "Summary of results:"
tail -n 20 ./test-results/data-accuracy-test.log

echo "Test completed successfully!"
