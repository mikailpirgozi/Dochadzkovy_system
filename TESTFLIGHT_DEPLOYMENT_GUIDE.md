# 🚀 TestFlight Deployment Guide - Dochádzka Pro

## 📋 Predpoklady

### 1. Apple Developer Account
- **Apple Developer Program** ($99/rok) - POVINNÉ
- Prístup do **App Store Connect**
- Overený Apple ID s platným platobným spôsobom

### 2. Potrebné Údaje
```bash
# Tieto údaje budeš potrebovať:
Apple ID: your-apple-id@example.com
Apple Team ID: XXXXXXXXXX (10 znakov)
App Store Connect App ID: 1234567890
Bundle Identifier: com.dochadzkapro.attendance
```

## 🔧 Krok 1: App Store Connect Setup

### A) Vytvorenie Novej Aplikácie
1. Choď na [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Vyplň údaje:
   - **Name**: Dochádzka Pro
   - **Primary Language**: Slovak
   - **Bundle ID**: com.dochadzkapro.attendance
   - **SKU**: dochadzka-pro-2024
   - **User Access**: Full Access

### B) App Information
```
Category: Business
Content Rights: No, it does not contain, show, or access third-party content
Age Rating: 4+ (No Restricted Content)
```

### C) Privacy Policy & Support
- **Privacy Policy URL**: (vytvor jednoduchú stránku)
- **Support URL**: (môže byť GitHub repo alebo jednoduchá stránka)

## 🏗️ Krok 2: EAS Build Configuration

### A) Aktualizácia eas.json
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "autoIncrement": true,
        "distribution": "store"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://backend-api-production-03aa.up.railway.app/api",
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    },
    "testflight": {
      "extends": "production",
      "ios": {
        "resourceClass": "m-medium",
        "autoIncrement": true,
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### B) Apple Developer Credentials
```bash
# Prihlásenie do EAS
npx eas login

# Konfigurácia Apple credentials
npx eas credentials:configure -p ios
```

## 🚀 Krok 3: Build & Upload Process

### A) Production Build
```bash
cd mobile/

# Build pre TestFlight
npx eas build --platform ios --profile testflight

# Alternatívne - ak chceš použiť production profil
npx eas build --platform ios --profile production
```

### B) Automatický Upload do App Store Connect
```bash
# EAS automaticky uploadne build do App Store Connect
# Proces trvá 15-30 minút
```

### C) Manuálny Upload (ak potrebný)
```bash
# Ak automatický upload zlyhá
npx eas submit --platform ios --latest
```

## 📱 Krok 4: TestFlight Configuration

### A) App Store Connect - TestFlight Tab
1. Choď do **App Store Connect** → **Your App** → **TestFlight**
2. Počkaj kým sa build spracuje (5-15 minút)
3. Build sa zobrazí v sekcii **iOS builds**

### B) Build Review
1. Klikni na build number
2. Vyplň **What to Test** (čo testovať):
```
Verzia 1.0.0 - Prvá beta verzia

Nové funkcie:
• GPS sledovanie dochádzky
• QR kód skenovanie
• Geofencing kontrola
• Push notifikácie
• Offline podpora
• Biometrické prihlásenie

Testovanie:
• Otestujte prihlásenie s demo účtom
• Vyskúšajte clock in/out funkcionalitu
• Overte GPS presnosť
• Testujte v rôznych lokalitách
```

### C) Export Compliance
- **Uses Encryption**: No (pre jednoduchosť)
- Alebo **Yes** → **Only uses standard encryption**

## 👥 Krok 5: Beta Testers Setup

### A) Internal Testing (Apple Team)
1. **TestFlight** → **Internal Testing**
2. **+** → Pridaj Apple Developer team members
3. Limit: 100 internal testerov

### B) External Testing (Public Beta)
1. **TestFlight** → **External Testing**
2. **+** → **Create New Group**
3. **Group Name**: "Public Beta"
4. **Add Build** → Vyber svoj build
5. Limit: 10,000 external testerov

### C) Beta App Review (External Testing)
- Apple musí schváliť external testing
- Proces trvá 24-48 hodín
- Potrebné: App description, feedback email, privacy policy

## 📧 Krok 6: Distribúcia Testerom

### A) Automatické Pozvánky
```
TestFlight automaticky pošle email pozvánky
Testeri dostanú link na stiahnutie TestFlight app
```

### B) Manuálne Pozvánky
1. **Add Testers** → Zadaj email adresy
2. Alebo zdieľaj **Public Link** (external testing)

### C) Public Link Example
```
https://testflight.apple.com/join/XXXXXXXX
```

## 🔄 Krok 7: Update Process

### A) Nová Verzia
```bash
# Aktualizuj verziu v app.config.js
version: "1.0.1"

# Build nová verzia
npx eas build --platform ios --profile testflight

# Upload automaticky
```

### B) TestFlight Notification
- Testeri dostanú automaticky notifikáciu o update
- Môžu si stiahnuť novú verziu cez TestFlight app

## 📊 Krok 8: Monitoring & Feedback

### A) TestFlight Analytics
- **App Store Connect** → **TestFlight** → **Analytics**
- Počet stiahnutí, aktívnych testerov, crash reports

### B) Crash Reports
- **App Store Connect** → **TestFlight** → **Crashes**
- Automatické crash reporting
- Stack traces a device info

### C) Feedback Collection
```typescript
// V aplikácii - feedback button
const sendFeedback = () => {
  const email = 'feedback@dochadzkapro.com';
  const subject = 'TestFlight Feedback - v1.0.0';
  const body = 'Describe your feedback here...';
  
  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};
```

## ⚠️ Časté Problémy & Riešenia

### 1. Build Failures
```bash
# Skontroluj certificates
npx eas credentials:list

# Regeneruj certificates
npx eas credentials:configure -p ios --clear-cache
```

### 2. Upload Errors
```bash
# Manuálny submit
npx eas submit --platform ios --latest --verbose
```

### 3. TestFlight Review Rejection
- Skontroluj App Store Review Guidelines
- Pridaj demo account credentials
- Vysvetli location permissions usage

### 4. Missing Compliance Info
```javascript
// V app.config.js
ios: {
  config: {
    usesNonExemptEncryption: false
  }
}
```

## 🎯 Deployment Commands Cheat Sheet

```bash
# 1. Login
npx eas login

# 2. Configure credentials
npx eas credentials:configure -p ios

# 3. Build for TestFlight
npx eas build --platform ios --profile production

# 4. Submit to App Store Connect
npx eas submit --platform ios --latest

# 5. Check build status
npx eas build:list

# 6. View credentials
npx eas credentials:list
```

## 📝 Checklist Pre TestFlight

- [ ] Apple Developer Account aktívny
- [ ] App Store Connect aplikácia vytvorená
- [ ] Bundle ID zaregistrovaný
- [ ] EAS credentials nakonfigurované
- [ ] Production build úspešný
- [ ] Upload do App Store Connect dokončený
- [ ] Export compliance vyplnený
- [ ] Beta testeri pridaní
- [ ] "What to Test" popis napísaný
- [ ] Privacy policy URL nastavená
- [ ] Support URL nastavená

## 🚀 Next Steps Po TestFlight

1. **Zbieraj feedback** od beta testerov
2. **Oprav bugs** a pridaj improvements
3. **Aktualizuj verziu** a pushni nové builds
4. **Pripravi App Store submission** pre production release
5. **Vytvor marketing materials** (screenshots, description)
6. **Naplánuj launch strategy**

---

**Poznámka**: TestFlight je ideálny na beta testovanie pred oficiálnym App Store launch. Umožňuje ti testovať s reálnymi používateľmi a zbierať cenný feedback pred produkčným nasadením.
