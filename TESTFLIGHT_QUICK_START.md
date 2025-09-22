# ⚡ TestFlight Quick Start - Dochádzka Pro

## 🚀 Okamžité Spustenie (5 minút setup)

### 1. Apple Developer Account
```bash
# Potrebuješ:
✅ Apple Developer Program ($99/rok)
✅ Prístup do App Store Connect
✅ Overený Apple ID
```

### 2. Rýchly Setup
```bash
# Choď do mobile priečinka
cd mobile/

# Nainštaluj EAS CLI (ak nemáš)
npm install -g @expo/eas-cli

# Prihlás sa
npx eas login

# Nastav Apple credentials
npx eas credentials:configure -p ios
```

### 3. App Store Connect - Rýchle Vytvorenie
1. **[App Store Connect](https://appstoreconnect.apple.com)** → **My Apps** → **+**
2. **Vyplň**:
   - Name: `Dochádzka Pro`
   - Bundle ID: `com.dochadzkapro.attendance`
   - Language: `Slovak`
3. **Ulož** a pokračuj

### 4. Build & Upload (1 príkaz)
```bash
# Automatický build + upload
./scripts/deploy-testflight.sh

# Alebo manuálne
npx eas build --platform ios --profile production
```

### 5. TestFlight Aktivácia (App Store Connect)
1. **TestFlight tab** → Počkaj na build processing
2. **Export Compliance** → "No" (alebo "Standard encryption only")
3. **What to Test** → Napíš popis testovania
4. **Internal Testing** → Pridaj testerov
5. **Start Testing** 🎉

---

## 📱 Demo Account Pre Testerov

```
Email: demo@dochadzkapro.com
Password: Demo123!
Company: Demo Company
```

## 🔗 Potrebné Linky

- **Privacy Policy**: `./mobile/app-store/privacy-policy.html`
- **Support URL**: GitHub repo alebo vlastná stránka
- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight App**: https://apps.apple.com/app/testflight/id899247664

## ⚡ Deployment Commands

```bash
# Rýchly deployment
cd mobile && ./scripts/deploy-testflight.sh

# Check build status
npx eas build:list

# Manual submit (ak treba)
npx eas submit --platform ios --latest
```

## 🎯 Čo Robiť Po Upload

1. **App Store Connect** → **TestFlight** → Počkaj 5-15 min
2. **Add Testers** → Email adresy alebo public link
3. **Distribute** → Testeri dostanú email
4. **Monitor** → Crashes, feedback, analytics

## 🚨 Časté Problémy

### Build Error
```bash
# Clear cache a retry
npx eas build --platform ios --profile production --clear-cache
```

### Credentials Error
```bash
# Regeneruj certificates
npx eas credentials:configure -p ios --clear-cache
```

### Upload Error
```bash
# Manual submit
npx eas submit --platform ios --latest --verbose
```

---

**🎉 Hotovo! Testeri môžu stiahnuť aplikáciu cez TestFlight app a začať testovať.**
