#!/bin/bash

# 🚀 TestFlight Deployment Script - Dochádzka Pro
# Automatizuje build a upload procesu do TestFlight

set -e

echo "🚀 Starting TestFlight deployment for Dochádzka Pro..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the mobile directory
if [ ! -f "app.config.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the mobile/ directory${NC}"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}⚠️  EAS CLI not found. Installing...${NC}"
    npm install -g @expo/eas-cli
fi

# Check if user is logged in to EAS
echo -e "${BLUE}🔐 Checking EAS authentication...${NC}"
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to EAS. Please login:${NC}"
    eas login
fi

# Display current project info
echo -e "${BLUE}📱 Project Information:${NC}"
echo "  App Name: Dochádzka Pro"
echo "  Bundle ID: com.dochadzkapro.attendance"
echo "  Platform: iOS"
echo "  Profile: testflight"

# Confirm deployment
read -p "🤔 Do you want to proceed with TestFlight deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  Deployment cancelled${NC}"
    exit 0
fi

# Pre-build checks
echo -e "${BLUE}🔍 Running pre-build checks...${NC}"

# Check for TypeScript errors
echo "  • Checking TypeScript..."
if ! npx tsc --noEmit; then
    echo -e "${RED}❌ TypeScript errors found. Please fix them before deployment.${NC}"
    exit 1
fi

# Check for ESLint errors
echo "  • Checking ESLint..."
if ! npx eslint . --ext .ts,.tsx --max-warnings 0; then
    echo -e "${RED}❌ ESLint errors found. Please fix them before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-build checks passed${NC}"

# Build for TestFlight
echo -e "${BLUE}🏗️  Building for TestFlight...${NC}"
echo "  This may take 15-30 minutes..."

if eas build --platform ios --profile testflight --non-interactive; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Get the latest build info
echo -e "${BLUE}📋 Getting build information...${NC}"
BUILD_INFO=$(eas build:list --platform ios --limit 1 --json)
BUILD_ID=$(echo $BUILD_INFO | jq -r '.[0].id')
BUILD_STATUS=$(echo $BUILD_INFO | jq -r '.[0].status')

echo "  Build ID: $BUILD_ID"
echo "  Status: $BUILD_STATUS"

if [ "$BUILD_STATUS" = "FINISHED" ]; then
    echo -e "${GREEN}✅ Build ready for TestFlight${NC}"
    
    # Optional: Auto-submit to App Store Connect
    read -p "🚀 Do you want to automatically submit to App Store Connect? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}📤 Submitting to App Store Connect...${NC}"
        if eas submit --platform ios --latest --non-interactive; then
            echo -e "${GREEN}✅ Successfully submitted to App Store Connect${NC}"
        else
            echo -e "${YELLOW}⚠️  Auto-submit failed. You can submit manually later.${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Build not ready. Status: $BUILD_STATUS${NC}"
fi

echo -e "${GREEN}🎉 TestFlight deployment process completed!${NC}"
echo
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Go to App Store Connect → TestFlight"
echo "  2. Wait for build processing (5-15 minutes)"
echo "  3. Add beta testers"
echo "  4. Fill in 'What to Test' information"
echo "  5. Distribute to testers"
echo
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "  • App Store Connect: https://appstoreconnect.apple.com"
echo "  • EAS Build Dashboard: https://expo.dev/accounts/[your-account]/projects/attendance-pro/builds"
echo "  • TestFlight Guide: ./TESTFLIGHT_DEPLOYMENT_GUIDE.md"
