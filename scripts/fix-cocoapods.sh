#!/bin/bash

# 🔧 CocoaPods Fix Script - Dochádzka Pro
# Opravuje encoding problémy s CocoaPods na macOS

set -e

echo "🔧 Fixing CocoaPods encoding issues..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fix UTF-8 encoding
echo -e "${BLUE}📝 Setting UTF-8 encoding...${NC}"
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Add to shell profile if not already there
if ! grep -q "export LANG=en_US.UTF-8" ~/.zshrc; then
    echo "export LANG=en_US.UTF-8" >> ~/.zshrc
    echo "export LC_ALL=en_US.UTF-8" >> ~/.zshrc
    echo -e "${GREEN}✅ Added UTF-8 encoding to ~/.zshrc${NC}"
fi

# Check if we're in the mobile directory
if [ ! -f "app.config.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the mobile/ directory${NC}"
    exit 1
fi

# Clean iOS build
echo -e "${BLUE}🧹 Cleaning iOS build...${NC}"
rm -rf ios
rm -rf node_modules/.cache

# Clear CocoaPods cache
echo -e "${BLUE}🗑️  Clearing CocoaPods cache...${NC}"
if command -v pod &> /dev/null; then
    pod cache clean --all 2>/dev/null || true
fi

# Reinstall node modules
echo -e "${BLUE}📦 Reinstalling node modules...${NC}"
npm install

# Prebuild iOS project
echo -e "${BLUE}🏗️  Rebuilding iOS project...${NC}"
npx expo prebuild --platform ios --clean

echo -e "${GREEN}✅ CocoaPods fix completed!${NC}"
echo
echo -e "${BLUE}🚀 You can now run:${NC}"
echo "  npx expo run:ios"
echo
echo -e "${BLUE}💡 If you still have issues, try:${NC}"
echo "  1. Restart your terminal"
echo "  2. Run: source ~/.zshrc"
echo "  3. Update CocoaPods: sudo gem install cocoapods"
