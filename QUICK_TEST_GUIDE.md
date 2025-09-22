# ⚡ Quick Test Guide - Dochádzka Pro

## 🚀 Okamžité Testovanie (Bez Apple Developer Account)

### 1. **🌐 Web Verzia** (30 sekúnd)
```bash
cd mobile
npx expo start --web
```
**Otvorí sa v prehliadači na http://localhost:8081**

---

### 2. **📱 iOS Simulator** (2 minúty)
```bash
# Ak máš CocoaPods problém, spusti najprv:
./scripts/fix-cocoapods.sh

# Potom spusti simulator:
cd mobile
npx expo run:ios
```

---

### 3. **🤖 Android Build** (15 minút - úplne zadarmo)
```bash
# Prihlás sa do EAS
npx eas login

# Build pre Android (zadarmo navždy)
npx eas build --platform android --profile development
```

---

### 4. **🔧 Expo Dev Build iOS** (20 minút - 7 dní trial)
```bash
# Build pre iOS bez Apple Developer Account
npx eas build --platform ios --profile development
```

---

## 🎯 Čo Testovať

### ✅ Web Verzia Testuje:
- Prihlásenie/registrácia
- Dashboard a štatistiky  
- Formuláre a validácie
- API komunikácia
- Responsive design

### ✅ iOS Simulator Testuje:
- Native iOS UI
- Push notifikácie (simulované)
- GPS location (fake coordinates)
- iOS gestúry a navigácia

### ✅ Android/Expo Dev Build Testuje:
- **Všetky funkcie vrátane:**
- Skutočné GPS tracking
- QR kód skenovanie
- Push notifikácie
- Biometrické prihlásenie
- Background location tracking

---

## 🚨 Riešenie Problémov

### CocoaPods Error:
```bash
./scripts/fix-cocoapods.sh
```

### Port už používaný:
```bash
# Zastaví všetky Expo procesy
npx expo start --clear
```

### Build Error:
```bash
# Vyčisti cache
npx expo install --fix
rm -rf node_modules && npm install
```

---

## 📱 Demo Účet Pre Testovanie

```
Email: demo@dochadzkapro.com
Password: Demo123!
Company: Demo Company
```

---

## 🎉 Quick Commands

```bash
# Web testovanie
cd mobile && npx expo start --web

# iOS Simulator  
cd mobile && npx expo run:ios

# Android build
npx eas build --platform android --profile development

# iOS dev build
npx eas build --platform ios --profile development
```

**Aplikácia je pripravená na testovanie! 🚀**
