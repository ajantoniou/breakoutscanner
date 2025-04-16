#!/bin/bash

echo "Setting up environment..."
export NODE_PATH="$NODE_PATH:./node_modules"
echo "NODE_PATH: $NODE_PATH"

echo "Running Vite build..."
./node_modules/.bin/vite build

exit $? 