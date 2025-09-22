# 🚀 Native Testing Guide - Push Notifikácie + Biometria + GPS

## 📱 **Kompletné Testovanie Všetkých Funkcií**

### 1. **🤖 Android APK** (💯 Najlepšia voľba - Zadarmo navždy)

```bash
# Build Android APK s plnou native podporou
npx eas build --platform android --profile development
```

**✅ Čo môžeš testovať:**
- ✅ **Push notifikácie** (Firebase Cloud Messaging)
- ✅ **Biometrické prihlásenie** (Fingerprint/Face unlock)
- ✅ **GPS tracking** (reálne location)
- ✅ **QR kód skenovanie** (kamera)
- ✅ **Background location** tracking
- ✅ **Geofencing** alerts
- ✅ **Offline mode** functionality
- ✅ **All UI/UX** features

**📲 Inštalácia:**
1. Build sa dokončí za 15-20 minút
2. Dostaneš link na stiahnutie APK
3. Nainštaluješ na Android zariadenie
4. Povoliš "Install from unknown sources"

---

### 2. **📱 Expo Development Build iOS** (7 dní trial)

```bash
# Build iOS Development Client
npx eas build --platform ios --profile development-device
```

**✅ Čo môžeš testovať:**
- ✅ **Push notifikácie** (Apple Push Notification Service)
- ✅ **Face ID / Touch ID** biometria
- ✅ **GPS tracking** (Core Location)
- ✅ **QR kód skenovanie** (AVFoundation)
- ✅ **Background location** (s povoleniami)
- ✅ **iOS-specific** UI/UX
- ✅ **Hot reload** development

**📲 Inštalácia:**
1. Build sa dokončí za 20-30 minút
2. Dostaneš link na stiahnutie
3. Nainštaluješ cez Safari na iPhone
4. Dôveruješ developer certificate

---

## 🔧 **Setup Pre Native Testovanie**

### A) EAS Account Setup
```bash
# Prihlás sa do EAS (zadarmo account)
npx eas login

# Konfigurácia projektu
npx eas build:configure
```

### B) Push Notifikácie Setup

#### Android (Firebase)
```bash
# 1. Choď na https://console.firebase.google.com
# 2. Vytvor nový projekt: "dochadzka-pro"
# 3. Add Android app s package: com.dochadzkapro.attendance
# 4. Stiahni google-services.json
```

#### iOS (Apple Push)
```bash
# Automaticky sa nakonfiguruje cez EAS Build
# Apple Push certificates sa vytvoria automaticky
```

### C) Biometria Setup
```javascript
// V app.config.js už máš nakonfigurované:
ios: {
  infoPlist: {
    NSFaceIDUsageDescription: "Táto aplikácia používa Face ID pre bezpečné a rýchle prihlásenie..."
  }
},
android: {
  permissions: [
    "USE_FINGERPRINT",
    "USE_BIOMETRIC"
  ]
}
```

---

## 🚀 **Build Commands**

### Android Development APK
```bash
cd mobile

# Build s development profile
npx eas build --platform android --profile development

# Alebo s preview profile (optimalizované)
npx eas build --platform android --profile preview
```

### iOS Development Build
```bash
cd mobile

# Build pre reálne zariadenie
npx eas build --platform ios --profile development-device

# Build pre simulator (bez biometrie)
npx eas build --platform ios --profile development
```

---

## 📱 **Testovanie Konkrétnych Funkcií**

### 1. **Push Notifikácie**

#### Test Push Notification
```bash
# Nainštaluj Expo CLI tool
npm install -g @expo/cli

# Pošli test notifikáciu
npx expo send --to ExponentPushToken[xxxxxx] --message "Test dochádzka notification"
```

#### V Aplikácii
```typescript
// Test push token získanie
import * as Notifications from 'expo-notifications';

const getToken = async () => {
  const token = await Notifications.getExpoPushTokenAsync();
  console.log('Push Token:', token.data);
  // Skopíruj token pre testovanie
};
```

### 2. **Biometrické Prihlásenie**

#### Test Face ID/Touch ID
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const testBiometrics = async () => {
  // Skontroluj dostupnosť
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  console.log('Biometric Hardware:', hasHardware);
  console.log('Biometric Enrolled:', isEnrolled);
  
  // Test autentifikácie
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Prihlás sa pomocou biometrie',
    fallbackLabel: 'Použiť heslo'
  });
  
  console.log('Auth Result:', result);
};
```

### 3. **GPS & Location Testing**

#### Test Presné GPS
```typescript
import * as Location from 'expo-location';

const testGPS = async () => {
  // Požiadaj o povolenia
  const { status } = await Location.requestForegroundPermissionsAsync();
  console.log('Location Permission:', status);
  
  // Získaj aktuálnu polohu
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation
  });
  
  console.log('GPS Location:', location);
  console.log('Accuracy:', location.coords.accuracy, 'meters');
};
```

#### Test Background Location
```typescript
// Test background tracking
const startBackgroundLocation = async () => {
  await Location.startLocationUpdatesAsync('background-location-task', {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // 30 sekúnd
    distanceInterval: 50 // 50 metrov
  });
};
```

### 4. **QR Kód Skenovanie**

#### Test Kamera & QR
```typescript
import { BarCodeScanner } from 'expo-barcode-scanner';

const testQRScanner = async () => {
  // Požiadaj o camera permission
  const { status } = await BarCodeScanner.requestPermissionsAsync();
  console.log('Camera Permission:', status);
  
  // QR scanner je pripravený
  // Test s QR kódom: "COMPANY_123_LOCATION_456"
};
```

---

## 🎯 **Testovací Scenár**

### Kompletný Test Workflow:

1. **Nainštaluj APK/IPA** na reálne zariadenie
2. **Registrácia/Prihlásenie** - test biometrie
3. **Povoľ všetky permissions** (location, camera, notifications)
4. **Test Clock In**:
   - GPS location detection
   - QR kód skenovanie
   - Push notifikácia potvrdenia
5. **Test Background**:
   - Minimalizuj aplikáciu
   - Pohyb mimo geofence
   - Push alert o opustení pracoviska
6. **Test Clock Out**:
   - GPS overenie
   - Výpočet pracovného času
   - Push notifikácia súhrnu

---

## 📊 **Monitoring & Debugging**

### Real-time Logs
```bash
# Android logs
adb logcat | grep -i expo

# iOS logs (ak máš Mac + Xcode)
xcrun simctl spawn booted log stream --predicate 'process CONTAINS "DochdzkaPro"'
```

### Expo Dev Tools
```bash
# Spusti dev server
npx expo start --dev-client

# Otvor v prehliadači developer tools
# Môžeš vidieť real-time logs z zariadenia
```

---

## 💡 **Pro Tips**

### Firebase Push Testing
```bash
# Test cez Firebase Console
# Messaging → New Campaign → Test Message
# Zadaj FCM token z aplikácie
```

### GPS Accuracy Testing
```bash
# Test v rôznych podmienkach:
# - Vonku (najlepšia presnosť)
# - Pri okne (stredná presnosť)  
# - V budove (najhoršia presnosť)
# - Pohyb vs. statická pozícia
```

### Biometria Edge Cases
```bash
# Test scenáre:
# - Prvé použitie (enrollment)
# - Neúspešná autentifikácia
# - Fallback na heslo
# - Vypnutá biometria v systéme
```

---

## 🎉 **Quick Start Commands**

```bash
# 1. Android APK (odporúčané)
npx eas build --platform android --profile development

# 2. iOS Development Build  
npx eas build --platform ios --profile development-device

# 3. Check build status
npx eas build:list

# 4. Download & install na zariadenie
# Link dostaneš v termináli po dokončení build
```

---

## 📱 **Čo Budeš Môcť Testovať**

| Funkcia | Android APK | iOS Dev Build | Web/Simulator |
|---------|-------------|---------------|---------------|
| **Push Notifikácie** | ✅ Plne | ✅ Plne | ❌ |
| **Biometria** | ✅ Fingerprint/Face | ✅ Face ID/Touch ID | ❌ |
| **GPS Tracking** | ✅ Reálne | ✅ Reálne | 🟡 Simulácia |
| **QR Skenovanie** | ✅ Kamera | ✅ Kamera | ❌ |
| **Background Location** | ✅ Plne | ✅ Plne | ❌ |
| **Geofencing** | ✅ Plne | ✅ Plne | ❌ |
| **Offline Mode** | ✅ Plne | ✅ Plne | 🟡 Čiastočne |

**Android APK je najlepšia voľba - zadarmo navždy a všetky funkcie fungujú na 100%! 🚀**
