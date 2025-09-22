#!/bin/bash

# 🚀 Native Testing Deployment Script - Dochádzka Pro
# Automatizuje build pre kompletné native testovanie (Push + Biometria + GPS)

set -e

echo "🚀 Starting Native Testing Deployment for Dochádzka Pro..."

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

# Display testing options
echo -e "${BLUE}📱 Native Testing Options:${NC}"
echo "  1. Android APK (💯 Zadarmo navždy - Odporúčané)"
echo "  2. iOS Development Build (7 dní trial)"
echo "  3. Both platforms"
echo

# Get user choice
read -p "🤔 Which platform do you want to build for testing? (1/2/3): " -n 1 -r
echo

case $REPLY in
    1)
        PLATFORM="android"
        PROFILE="development"
        echo -e "${GREEN}✅ Selected: Android APK${NC}"
        ;;
    2)
        PLATFORM="ios"
        PROFILE="development-device"
        echo -e "${GREEN}✅ Selected: iOS Development Build${NC}"
        ;;
    3)
        PLATFORM="all"
        PROFILE="development"
        echo -e "${GREEN}✅ Selected: Both platforms${NC}"
        ;;
    *)
        echo -e "${YELLOW}⏹️  Invalid selection. Defaulting to Android APK${NC}"
        PLATFORM="android"
        PROFILE="development"
        ;;
esac

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

# Build function
build_platform() {
    local platform=$1
    local profile=$2
    
    echo -e "${BLUE}🏗️  Building for $platform...${NC}"
    echo "  Profile: $profile"
    echo "  This may take 15-30 minutes..."
    echo

    if eas build --platform $platform --profile $profile --non-interactive; then
        echo -e "${GREEN}✅ $platform build completed successfully${NC}"
        
        # Get build info
        BUILD_INFO=$(eas build:list --platform $platform --limit 1 --json)
        BUILD_ID=$(echo $BUILD_INFO | jq -r '.[0].id')
        BUILD_URL=$(echo $BUILD_INFO | jq -r '.[0].artifacts.buildUrl // empty')
        
        echo -e "${BLUE}📋 Build Information:${NC}"
        echo "  Build ID: $BUILD_ID"
        if [ ! -z "$BUILD_URL" ] && [ "$BUILD_URL" != "null" ]; then
            echo "  Download URL: $BUILD_URL"
        fi
        echo
        
        return 0
    else
        echo -e "${RED}❌ $platform build failed${NC}"
        return 1
    fi
}

# Execute builds
if [ "$PLATFORM" = "all" ]; then
    echo -e "${BLUE}🚀 Building for both platforms...${NC}"
    
    # Build Android first (faster)
    if build_platform "android" "development"; then
        ANDROID_SUCCESS=true
    else
        ANDROID_SUCCESS=false
    fi
    
    # Build iOS
    if build_platform "ios" "development-device"; then
        IOS_SUCCESS=true
    else
        IOS_SUCCESS=false
    fi
    
    # Summary
    echo -e "${BLUE}📊 Build Summary:${NC}"
    if [ "$ANDROID_SUCCESS" = true ]; then
        echo -e "  Android: ${GREEN}✅ Success${NC}"
    else
        echo -e "  Android: ${RED}❌ Failed${NC}"
    fi
    
    if [ "$IOS_SUCCESS" = true ]; then
        echo -e "  iOS: ${GREEN}✅ Success${NC}"
    else
        echo -e "  iOS: ${RED}❌ Failed${NC}"
    fi
    
else
    # Build single platform
    build_platform $PLATFORM $PROFILE
fi

echo -e "${GREEN}🎉 Native Testing Deployment Completed!${NC}"
echo
echo -e "${BLUE}📱 Next Steps:${NC}"
echo "  1. Download the build from the provided URL"
echo "  2. Install on your device:"
echo "     • Android: Enable 'Install from unknown sources' and install APK"
echo "     • iOS: Open link in Safari and trust developer certificate"
echo "  3. Test native features:"
echo "     • Push notifications"
echo "     • Biometric authentication (Face ID/Touch ID/Fingerprint)"
echo "     • GPS location tracking"
echo "     • QR code scanning"
echo "     • Background location"
echo
echo -e "${BLUE}🧪 Testing Tools:${NC}"
echo "  • Use BiometricTestComponent in app for comprehensive testing"
echo "  • Run: node ../scripts/test-push-notifications.js [your-push-token]"
echo "  • Check build status: eas build:list"
echo
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "  • EAS Build Dashboard: https://expo.dev/accounts/[your-account]/projects/attendance-pro/builds"
echo "  • Native Testing Guide: ../NATIVE_TESTING_GUIDE.md"
echo "  • Push Notification Tester: ../scripts/test-push-notifications.js"
