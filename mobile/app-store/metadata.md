# 📱 App Store Metadata - Dochádzka Pro

## 🎯 App Store Listing

### App Name
**Dochádzka Pro** (Slovak)
**Attendance Pro** (English/International)

### Subtitle
**Professional attendance tracking with GPS**

### Description (Slovak)

**Moderná aplikácia pre sledovanie dochádzky s GPS trackingom**

Dochádzka Pro je pokročilý systém pre sledovanie pracovného času určený pre firmy, ktoré potrebují presné a spoľahlivé sledovanie dochádzky svojich zamestnancov.

**Kľúčové funkcie:**
• 📍 GPS sledovanie v reálnom čase počas pracovných hodín
• 📱 QR kód pipnutie s geofencing validáciou
• 🔔 Inteligentné upozornenia a alerty
• ⏰ Automatické sledovanie prestávok a odpracovaných hodín
• 🚗 Podpora služobných ciest a práce mimo kancelárie
• 📊 Detailné reporty a štatistiky
• 🏢 Multi-tenant podpora pre viacero firiem

**Pre zamestnancov:**
• Jednoduché pipnutie cez QR kód
• Automatické upozornenia pri opustení pracoviska
• Prehľad odpracovaných hodín
• Offline režim s automatickou synchronizáciou

**Pre adminov a manažérov:**
• Live dashboard s prehľadom všetkých zamestnancov
• GPS tracking v reálnom čase na mape
• Automatické alerty pri porušení pravidiel
• Flexibilné nastavenia pracovných časov
• Export reportov do CSV/Excel

**Bezpečnosť a súkromie:**
• Sledovanie LEN počas pracovných hodín
• Šifrovanie všetkých dát
• GDPR compliance
• Transparentné používanie GPS údajov

Aplikácia je ideálna pre stavebné firmy, servisné organizácie, terenných pracovníkov a všetky firmy, ktoré potrebujú presné sledovanie pracovného času s GPS verifikáciou.

### Description (English)

**Professional attendance tracking with GPS verification**

Attendance Pro is an advanced time tracking system designed for businesses that need accurate and reliable employee attendance monitoring.

**Key Features:**
• 📍 Real-time GPS tracking during work hours only
• 📱 QR code clock-in with geofencing validation
• 🔔 Smart notifications and alerts
• ⏰ Automatic break and work hours tracking
• 🚗 Business trip and remote work support
• 📊 Detailed reports and analytics
• 🏢 Multi-tenant support for multiple companies

**For Employees:**
• Simple clock-in via QR code scanning
• Automatic alerts when leaving work area
• Overview of worked hours
• Offline mode with automatic sync

**For Admins and Managers:**
• Live dashboard with all employee overview
• Real-time GPS tracking on map
• Automatic alerts for policy violations
• Flexible work time settings
• Export reports to CSV/Excel

**Privacy and Security:**
• Location tracking ONLY during work hours
• All data encrypted and secure
• GDPR compliant
• Transparent GPS data usage

Perfect for construction companies, service organizations, field workers, and any business requiring accurate time tracking with GPS verification.

### Keywords
**Slovak:** dochádzka, GPS, sledovanie, práca, čas, zamestnanci, firma, pipnutie, QR kód
**English:** attendance, GPS, tracking, work, time, employees, business, clock-in, QR code

### Category
**Business**

### Age Rating
**4+ (No objectionable content)**

## 📱 Screenshots Requirements

### iPhone Screenshots (6.7" Display)
1. **Login Screen** - Show company login with clear branding
2. **Attendance Screen** - Main clock-in interface with status
3. **QR Scanner** - QR code scanning interface
4. **Location Verification** - GPS accuracy and geofence status
5. **Dashboard** - Employee work hours and statistics

### iPad Screenshots (12.9" Display)
1. **Dashboard Overview** - Live employee tracking map
2. **Reports Screen** - Detailed attendance reports
3. **Employee Management** - Admin interface for user management

### Required Text Overlays
- **Secure GPS Tracking** - "Location tracked only during work hours"
- **Easy Clock-In** - "Simple QR code scanning for attendance"
- **Real-Time Alerts** - "Instant notifications for policy compliance"
- **Comprehensive Reports** - "Detailed analytics for better workforce management"

## 🔒 App Store Review Notes

### Review Guidelines Compliance

**2.5.1 - Software Requirements**
✅ App uses only documented APIs
✅ No private frameworks used
✅ Follows iOS design guidelines

**2.5.6 - Apple Pay**
✅ Not applicable - no payment processing

**2.5.11 - SiriKit**
✅ Not applicable - no SiriKit integration

**5.1.1 - Privacy - Data Collection and Storage**
✅ Clear privacy policy provided
✅ Location usage clearly explained
✅ Data minimization practiced
✅ User consent obtained

**5.1.2 - Privacy - Data Use and Sharing**
✅ Data used only for stated purpose (attendance tracking)
✅ No data sharing with third parties
✅ No advertising or tracking

### Location Usage Justification

**Business Justification:**
This app is designed for legitimate employee attendance tracking in business environments. Location data is collected ONLY during work hours and ONLY for the following business purposes:

1. **Attendance Verification** - Verify employees are at designated work locations when clocking in/out
2. **Geofencing Alerts** - Alert employees if they leave work area without clocking out
3. **Payroll Accuracy** - Ensure accurate time tracking for payroll purposes
4. **Compliance** - Meet labor law requirements for work hour documentation

**Data Minimization:**
- Location tracked ONLY when employee is clocked in for work
- Tracking automatically STOPS when employee clocks out
- No location data collected during personal time
- Data retained only as long as required for payroll/legal purposes

**User Consent:**
- Clear onboarding explains location usage
- Users must explicitly consent to location tracking
- Users informed this is for work-related tracking only
- Privacy policy clearly explains data usage

### Review Response Template

```
REVIEW NOTES FOR APPLE:

This is a legitimate business attendance tracking application used by employers to track employee work hours and location during work shifts only.

LOCATION USAGE:
- Location is collected ONLY during active work hours (when clocked in)
- Used to verify employees are at designated work locations
- Prevents time fraud and ensures accurate payroll
- Automatically stops tracking when employee clocks out
- No tracking during personal time or when off duty

BUSINESS JUSTIFICATION:
- Replaces traditional time clocks and manual timesheets
- Required for accurate payroll and labor law compliance
- Prevents buddy punching and location fraud
- Used by legitimate businesses for workforce management

USER CONSENT:
- Clear onboarding explains why location is needed
- Users explicitly consent to location tracking
- Privacy policy explains data usage and retention
- Employees informed this is work-related tracking app

DATA MINIMIZATION:
- Only collects location during work periods
- Location data used solely for attendance verification
- No advertising or third-party sharing
- Data retained only for payroll/legal requirements

This app serves a legitimate business need and follows all Apple guidelines for employee tracking applications.
```

## 🚀 Build and Release Process

### 1. Development Build
```bash
eas build --platform all --profile development
```

### 2. Internal Testing
```bash
eas build --platform all --profile preview
eas submit --platform ios --profile preview
```

### 3. Production Release
```bash
# Update version in app.json
eas build --platform all --profile production
eas submit --platform all --profile production
```

### 4. TestFlight Setup (iOS)
1. Upload build via EAS Submit
2. Add external testers
3. Provide clear testing instructions
4. Include privacy policy link
5. Test all location features thoroughly

### 5. Google Play Internal Testing (Android)
1. Upload AAB via EAS Submit
2. Create internal testing track
3. Add test users
4. Test location permissions on various devices
5. Verify background location works correctly

## 📋 Pre-Submission Checklist

### Technical Requirements
- [ ] App builds successfully for both platforms
- [ ] All location permissions work correctly
- [ ] Background location tracking functions properly
- [ ] QR code scanning works on all supported devices
- [ ] Push notifications deliver correctly
- [ ] Offline mode synchronizes properly
- [ ] No crashes or memory leaks detected

### Compliance Requirements
- [ ] Privacy policy published and linked
- [ ] Location usage clearly explained in app
- [ ] User consent flow implemented
- [ ] Privacy manifest included (iOS)
- [ ] All required permissions declared
- [ ] App Store review notes prepared

### Content Requirements
- [ ] App screenshots prepared (all required sizes)
- [ ] App description written in target languages
- [ ] Keywords optimized for discovery
- [ ] App icon meets guidelines (1024x1024)
- [ ] Splash screen optimized

### Legal Requirements
- [ ] Terms of service published
- [ ] Privacy policy compliant with local laws
- [ ] Data retention policy documented
- [ ] User rights clearly explained
- [ ] Contact information for privacy inquiries

## 🌍 Localization

### Supported Languages
1. **Slovak** (Primary) - Full localization
2. **English** - Full localization
3. **Czech** - Planned for future release

### Localization Files
- `mobile/locales/sk.json` - Slovak translations
- `mobile/locales/en.json` - English translations
- `mobile/locales/cs.json` - Czech translations (future)

### App Store Descriptions
- Prepare descriptions in all supported languages
- Ensure cultural appropriateness
- Include relevant local business terms
- Optimize keywords for each market

## 📞 Support and Contact

### Support Channels
- **Email:** support@attendance-pro.com
- **Website:** https://attendance-pro.com/support
- **Documentation:** https://docs.attendance-pro.com

### Privacy Contact
- **Email:** privacy@attendance-pro.com
- **Response time:** 48 hours maximum
- **GDPR compliance:** Full support for user rights

### Business Contact
- **Sales:** sales@attendance-pro.com
- **Partnerships:** partnerships@attendance-pro.com
- **Demo requests:** demo@attendance-pro.com
