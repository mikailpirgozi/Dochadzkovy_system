# 🚀 Testovanie Bez Apple Developer Account

## 📱 Všetky Možnosti Testovania (Bez $99 Fee)

### 1. **🌐 Web Verzia** (⚡ Okamžité - 30 sekúnd)

```bash
cd mobile
npx expo start --web
```

**✅ Výhody:**
- Okamžité spustenie v prehliadači
- Všetky UI komponenty fungujú
- Formuláre, navigácia, API calls
- Responsive design testing
- Žiadne inštalácie potrebné

**❌ Obmedzenia:**
- Žiadne GPS/location služby
- Žiadna kamera/QR skenovanie
- Žiadne push notifikácie
- Žiadne biometrické overenie

---

### 2. **📱 iOS Simulator** (🔥 Najlepšie na Mac)

```bash
# Oprav encoding issue
export LANG=en_US.UTF-8

# Spusti simulator
cd mobile
npx expo run:ios
```

**✅ Výhody:**
- 95% funkcionalita reálneho zariadenia
- GPS simulácia (môžeš nastaviť fake location)
- Kamera simulácia
- Push notifikácie
- Všetky UI komponenty
- Debugging tools

**❌ Obmedzenia:**
- Potrebuješ Mac
- Žiadne reálne GPS testovanie
- Žiadne biometrické overenie

---

### 3. **🔧 Expo Development Build** (🎯 Najlepšia alternatíva)

```bash
# Build pre simulator (ZADARMO)
npx eas build --platform ios --profile development

# Build pre fyzické zariadenie (7 dní free trial)
npx eas build --platform ios --profile development-device
```

**✅ Výhody:**
- Všetky native funkcie fungujú
- Reálne GPS testovanie
- Kamera a QR skenovanie
- Push notifikácie
- Biometrické overenie
- Hot reload development

**❌ Obmedzenia:**
- EAS Build má 7-dňový free trial
- Potom $29/mesiac (ale stále lacnejšie ako Apple Developer)

---

### 4. **🤖 Android Testovanie** (💯 Kompletne zadarmo)

```bash
# Android build (úplne zadarmo)
npx eas build --platform android --profile development

# Alebo local build
npx expo run:android
```

**✅ Výhody:**
- Úplne zadarmo navždy
- Všetky funkcie fungujú
- Reálne zariadenie testovanie
- Google Play Internal Testing (zadarmo)
- Neobmedzené builds

---

## 🎯 **Odporúčaná Stratégia Testovania**

### Fáza 1: **Web Testovanie** (Okamžite)
```bash
cd mobile && npx expo start --web
```
- Otestuj UI/UX
- Formuláre a validácie
- API integráciu
- Navigáciu

### Fáza 2: **iOS Simulator** (Ak máš Mac)
```bash
cd mobile && npx expo run:ios
```
- Otestuj iOS-specific UI
- Simuluj GPS location
- Otestuj push notifikácie

### Fáza 3: **Android Build** (Zadarmo)
```bash
npx eas build --platform android --profile development
```
- Reálne zariadenie testovanie
- GPS, kamera, všetky funkcie
- Distribuuj cez Google Play Internal Testing

### Fáza 4: **Expo Dev Build** (7 dní trial)
```bash
npx eas build --platform ios --profile development-device
```
- Kompletné iOS testovanie na reálnom zariadení
- Všetky native funkcie

---

## 🛠️ **Setup Commands**

### Web Testovanie
```bash
cd mobile
npx expo start --web
# Otvorí sa v prehliadači na http://localhost:8081
```

### iOS Simulator Setup
```bash
# Nainštaluj Xcode (ak nemáš)
# App Store → Xcode (zadarmo)

# Oprav encoding
export LANG=en_US.UTF-8

# Spusti simulator
cd mobile
npx expo run:ios
```

### Android Setup
```bash
# Nainštaluj Android Studio (zadarmo)
# https://developer.android.com/studio

# Setup Android SDK
npx expo install --fix

# Build pre Android
npx eas build --platform android --profile development
```

### Expo Dev Build
```bash
# Prihlás sa do EAS (zadarmo account)
npx eas login

# Build pre simulator
npx eas build --platform ios --profile development

# Build pre reálne zariadenie
npx eas build --platform ios --profile development-device
```

---

## 📊 **Porovnanie Možností**

| Metóda | Cena | GPS | Kamera | Push | Biometria | Reálne Zariadenie |
|--------|------|-----|--------|------|-----------|-------------------|
| **Web** | 🟢 Zadarmo | ❌ | ❌ | ❌ | ❌ | ❌ |
| **iOS Simulator** | 🟢 Zadarmo | 🟡 Simulácia | 🟡 Simulácia | ✅ | ❌ | ❌ |
| **Android** | 🟢 Zadarmo | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Expo Dev Build** | 🟡 7 dní trial | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TestFlight** | 🔴 $99/rok | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 **Konkrétne Testovanie Funkcií**

### 🌐 **Web Verzia Testuje:**
- ✅ Prihlásenie/registrácia
- ✅ Dashboard a štatistiky
- ✅ Formuláre (corrections, overtime)
- ✅ API komunikácia
- ✅ Responsive design
- ✅ Navigácia medzi obrazovkami

### 📱 **iOS Simulator Testuje:**
- ✅ Všetko z web verzie +
- ✅ Native iOS UI komponenty
- ✅ Push notifikácie (simulované)
- ✅ GPS location (fake coordinates)
- ✅ iOS-specific gestúry
- ✅ Dark/Light mode

### 🤖 **Android Testuje:**
- ✅ Všetko vrátane reálnych funkcií
- ✅ Skutočné GPS tracking
- ✅ QR kód skenovanie
- ✅ Push notifikácie
- ✅ Biometrické prihlásenie
- ✅ Background location tracking

---

## 🚀 **Quick Start Commands**

```bash
# 1. Web testovanie (30 sekúnd)
cd mobile && npx expo start --web

# 2. iOS Simulator (5 minút setup)
export LANG=en_US.UTF-8
cd mobile && npx expo run:ios

# 3. Android build (15 minút)
npx eas build --platform android --profile development

# 4. Expo Dev Build iOS (20 minút)
npx eas build --platform ios --profile development-device
```

---

## 💡 **Pro Tips**

### GPS Testovanie v Simulátore
```
iOS Simulator → Features → Location → Custom Location
Zadaj súradnice: 48.1486, 17.1077 (Bratislava)
```

### Push Notifikácie Testovanie
```bash
# Expo push notification tool
npx expo send --to ExponentPushToken[xxx] --message "Test notification"
```

### QR Kód Testovanie
```
Použij online QR generátor:
https://qr-code-generator.com
Vygeneruj QR s textom: "COMPANY_123_LOCATION_456"
```

### API Testovanie
```bash
# Test backend API
curl -X POST https://backend-api-production-03aa.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123"}'
```

---

## 🎉 **Záver**

**Najlepšia stratégia bez Apple Developer Account:**

1. **Začni s web verziou** - okamžité testovanie UI/UX
2. **Pokračuj s iOS simulátorom** - native iOS testovanie
3. **Postav Android verziu** - kompletné reálne testovanie zadarmo
4. **Vyskúšaj Expo Dev Build** - 7 dní iOS testovanie na reálnom zariadení

Týmto spôsobom otestuješ 95% funkcionalite bez platenia $99 za Apple Developer Account! 🚀
