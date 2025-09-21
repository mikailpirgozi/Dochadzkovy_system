#!/bin/bash

# 🚀 Production Deployment Script for Dochádzka Pro
# This script automates the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for Dochádzka Pro..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
WEB_DASHBOARD_DIR="web-dashboard"
MOBILE_DIR="mobile"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        log_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        log_warning "EAS CLI not found. Installing..."
        npm install -g @expo/eas-cli
    fi
    
    log_success "All dependencies checked"
}

run_tests() {
    log_info "Running tests..."
    
    # Backend tests
    log_info "Running backend tests..."
    cd $BACKEND_DIR
    npm test -- --run
    cd ..
    
    # Mobile tests
    log_info "Running mobile tests..."
    cd $MOBILE_DIR
    npm test
    cd ..
    
    # Web dashboard tests
    log_info "Running web dashboard tests..."
    cd $WEB_DASHBOARD_DIR
    npm test
    cd ..
    
    log_success "All tests passed"
}

lint_and_format() {
    log_info "Running linting and formatting..."
    
    # Backend
    cd $BACKEND_DIR
    npm run lint:fix
    npm run format
    cd ..
    
    # Mobile
    cd $MOBILE_DIR
    npm run lint:fix
    cd ..
    
    # Web dashboard
    cd $WEB_DASHBOARD_DIR
    npm run lint:fix
    cd ..
    
    log_success "Code linted and formatted"
}

build_backend() {
    log_info "Building and deploying backend..."
    
    cd $BACKEND_DIR
    
    # Install dependencies
    npm ci --production
    
    # Run database migrations
    npx prisma generate
    npx prisma migrate deploy
    
    # Build TypeScript
    npm run build
    
    # Deploy to Railway
    railway up
    
    # Run post-deployment tasks
    railway run npm run db:seed
    
    cd ..
    
    log_success "Backend deployed successfully"
}

build_web_dashboard() {
    log_info "Building and deploying web dashboard..."
    
    cd $WEB_DASHBOARD_DIR
    
    # Install dependencies
    npm ci
    
    # Build for production
    npm run build
    
    # Deploy to Vercel/Netlify (configure as needed)
    # npx vercel --prod
    # or
    # npx netlify deploy --prod --dir=dist
    
    cd ..
    
    log_success "Web dashboard built successfully"
}

build_mobile_app() {
    log_info "Building mobile app..."
    
    cd $MOBILE_DIR
    
    # Install dependencies
    npm ci
    
    # Update app version
    CURRENT_VERSION=$(grep '"version"' app.json | sed 's/.*"version": "\(.*\)".*/\1/')
    log_info "Current version: $CURRENT_VERSION"
    
    # Build for production
    log_info "Building iOS and Android apps..."
    eas build --platform all --profile production --non-interactive
    
    cd ..
    
    log_success "Mobile app built successfully"
}

submit_to_stores() {
    log_info "Submitting to app stores..."
    
    cd $MOBILE_DIR
    
    # Submit to Apple App Store
    log_info "Submitting to Apple App Store..."
    eas submit --platform ios --profile production --non-interactive
    
    # Submit to Google Play Store
    log_info "Submitting to Google Play Store..."
    eas submit --platform android --profile production --non-interactive
    
    cd ..
    
    log_success "Apps submitted to stores"
}

update_documentation() {
    log_info "Updating documentation..."
    
    # Update version in README
    CURRENT_VERSION=$(grep '"version"' mobile/app.json | sed 's/.*"version": "\(.*\)".*/\1/')
    sed -i.bak "s/Version: [0-9.]*/Version: $CURRENT_VERSION/g" README.md
    
    # Update IMPLEMENTATION_PLAN.md
    DATE=$(date +"%Y-%m-%d")
    echo "- ✅ **Production Deployment** - $DATE - Version $CURRENT_VERSION deployed" >> IMPLEMENTATION_PLAN.md
    
    log_success "Documentation updated"
}

create_release_notes() {
    log_info "Creating release notes..."
    
    CURRENT_VERSION=$(grep '"version"' mobile/app.json | sed 's/.*"version": "\(.*\)".*/\1/')
    DATE=$(date +"%Y-%m-%d")
    
    cat > RELEASE_NOTES.md << EOF
# 🚀 Release Notes - Dochádzka Pro v$CURRENT_VERSION

**Release Date:** $DATE

## ✨ New Features
- Enhanced GPS tracking accuracy
- Improved battery optimization
- Better offline support
- Performance improvements

## 🔧 Bug Fixes
- Fixed location permission handling
- Improved error messages
- Better network error handling
- Enhanced stability

## 📱 Technical Improvements
- Updated to latest Expo SDK
- Improved TypeScript coverage
- Enhanced security measures
- Better performance monitoring

## 🔒 Privacy & Security
- Enhanced privacy controls
- Improved data encryption
- Better compliance with privacy laws
- Updated privacy policy

## 📊 Performance
- Faster app startup
- Reduced battery usage
- Improved GPS accuracy
- Better network efficiency

## 🌍 Compatibility
- iOS 15.1+ support
- Android 8.0+ support
- Latest device compatibility
- Improved accessibility

---

For technical support, contact: support@attendance-pro.com
EOF

    log_success "Release notes created"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove build artifacts
    find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove log files
    find . -name "*.log" -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main deployment process
main() {
    log_info "🚀 Dochádzka Pro Production Deployment Started"
    log_info "================================================="
    
    # Pre-deployment checks
    check_dependencies
    
    # Code quality
    lint_and_format
    run_tests
    
    # Build and deploy
    build_backend
    build_web_dashboard
    build_mobile_app
    
    # App Store submission
    submit_to_stores
    
    # Documentation
    update_documentation
    create_release_notes
    
    # Cleanup
    cleanup
    
    log_success "🎉 Production deployment completed successfully!"
    log_info "================================================="
    log_info "📱 Mobile apps submitted to App Store and Google Play"
    log_info "🌐 Backend deployed to Railway"
    log_info "💻 Web dashboard ready for deployment"
    log_info "📚 Documentation updated"
    log_info ""
    log_info "Next steps:"
    log_info "1. Monitor app store review process"
    log_info "2. Test production environment"
    log_info "3. Prepare marketing materials"
    log_info "4. Set up customer support"
}

# Error handling
trap 'log_error "Deployment failed. Check logs for details."; exit 1' ERR

# Run main function
main "$@"
