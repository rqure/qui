#!/bin/sh

# Install global packages
npm install -g @vue/cli

# Install project dependencies (if package.json exists)
if [ -f "package.json" ]; then
    npm install
fi
