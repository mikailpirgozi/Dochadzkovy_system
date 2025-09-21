# 📱 Dochádzka Pro - Multi-Tenant Attendance System

> **Moderná natívna aplikácia pre sledovanie dochádzky s GPS trackingom, QR kódmi a multi-tenant architektúrou**

## 🎯 Prehľad

Dochádzka Pro je pokročilý systém pre sledovanie pracovného času s nasledovnými kľúčovými funkciami:

- **GPS sledovanie** v reálnom čase počas pracovných hodín
- **QR kód pipnutie** s geofencing validáciou  
- **Multi-tenant** podpora pre viacero firiem
- **Inteligentné upozornenia** pre zamestnancov a adminov
- **Flexibilné pracovné časy** a služobné cesty
- **Pokročilé reporty** a dashboard pre adminov

## 🏗️ Architektúra

### Frontend (Mobile App)
```
React Native + Expo SDK 50+
├── Expo Router (file-based routing)
├── TypeScript
├── NativeWind (Tailwind CSS)
├── Zustand (state management)
├── React Query (server state)
├── Expo Location (GPS tracking)
├── Expo Task Manager (background tasks)
├── Expo Notifications (push notifications)
└── Expo Barcode Scanner (QR scanning)
```

### Backend (Railway)
```
Node.js + Express + TypeScript
├── PostgreSQL (primary database)
├── Prisma ORM (database management)
├── JWT Authentication
├── Socket.IO (real-time updates)
├── Node-cron (scheduled tasks)
├── Nodemailer (email notifications)
└── Express Rate Limit (API protection)
```

### Infrastructure
```
Railway Platform
├── PostgreSQL Database
├── Redis (caching & sessions)
├── File Storage (QR codes, exports)
├── Environment Variables
└── Automatic Deployments
```

## 🚀 Kľúčové Funkcie

### 👤 Pre Zamestnancov
- **Jednoduché pipnutie** cez QR kód + GPS validácia
- **Automatické upozornenia** pri opustení pracoviska (100m, 5 min)
- **Sledovanie času** - príchod, odchod, obed, súkromné veci, služobné cesty
- **Prehľad odpracovaných hodín** za aktuálny mesiac
- **Požiadavky na korekcie** s popisom a odôvodnením
- **Offline režim** s automatickou synchronizáciou

### 👨‍💼 Pre Adminov/Manažérov
- **Live dashboard** s prehľadom všetkých zamestnancov
- **GPS tracking** v reálnom čase na mape
- **Automatické alerty** pri porušení pravidiel
- **Flexibilné nastavenia** pracovných časov a miezd
- **Schvaľovanie korekcií** a služobných ciest
- **Export reportov** (CSV, Excel) s filtrami
- **Multi-tenant správa** viacerých firiem

### 🏢 Multi-Tenant Funkcie
- **Nezávislé firmy** s vlastnými nastaveniami
- **Rôzne QR kódy** pre každú firmu
- **Individuálne geofence** zóny
- **Samostatné používateľské roly** a povolenia
- **Izolované dáta** medzi firmami

## 📊 Typy Aktivít

| Typ | Popis | Počíta sa do práce | GPS sledovanie |
|-----|-------|-------------------|----------------|
| **Príchod** | Začiatok pracovnej zmeny | ✅ Áno | ✅ Áno |
| **Odchod** | Koniec pracovnej zmeny | ❌ Nie | ❌ Nie |
| **Obed** | Obedňajšia prestávka (max 60 min) | ❌ Nie | ❌ Nie |
| **Súkromné** | Osobné veci (neobmedzene) | ❌ Nie | ❌ Nie |
| **Služobná cesta** | Práca mimo firmy | ✅ Áno | ✅ Áno |

## 🔧 Technické Požiadavky

### Mobile App
- **iOS 13.0+** / **Android 8.0+**
- **GPS** - vždy zapnuté počas práce
- **Internet** - vyžadované pre synchronizáciu
- **Kamera** - pre QR kód skenovanie
- **Push notifikácie** - povolené

### Backend
- **Node.js 18+**
- **PostgreSQL 14+**
- **Redis 6+**
- **Railway Account**

## 🛠️ Inštalácia a Setup

### 1. Klonuj Repository
```bash
git clone <repository-url>
cd attendance-pro
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Nastav environment variables
npm run db:migrate
npm run db:seed
npm run dev
```

### 3. Mobile App Setup
```bash
cd mobile
npm install
npx expo install
# Nastav environment variables v app.config.js
npx expo start
```

### 4. Railway Deployment
```bash
# Pripoj Railway CLI
railway login
railway link
railway up
```

## 🌍 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"
REDIS_URL="redis://host:port"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# App Settings
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="exp://192.168.1.100:8081"
```

### Mobile App (app.config.js)
```javascript
export default {
  expo: {
    extra: {
      API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
    }
  }
}
```

## 📱 Používateľské Roly

### 🔹 Super Admin
- Správa všetkých firiem
- Vytvorenie nových firiem
- Globálne nastavenia systému
- Prístup k všetkým dátam

### 🔸 Company Admin  
- Správa jednej firmy
- Pridávanie/upravovanie zamestnancov
- Nastavenie pracovných časov a miezd
- Schvaľovanie korekcií
- Prístup k reportom svojej firmy

### 🔹 Manager
- Sledovanie svojho tímu
- Dostávanie alertov
- Základné reporty
- Schvaľovanie služobných cest

### 🔸 Employee
- Pipnutie do/z práce
- Sledovanie vlastných hodín
- Požiadavky na korekcie
- Nahlasovanie služobných ciest

## 🗄️ Databázová Schéma

### Hlavné Tabuľky
```sql
-- Firmy (multi-tenant)
companies (id, name, settings, qr_code, geofence, created_at)

-- Používatelia
users (id, company_id, email, role, settings, created_at)

-- Dochádzka
attendance_events (id, user_id, type, timestamp, location, qr_verified)

-- GPS sledovanie  
location_logs (id, user_id, latitude, longitude, accuracy, timestamp)

-- Upozornenia
alerts (id, user_id, type, message, resolved, created_at)

-- Korekcie
corrections (id, user_id, original_event, requested_change, reason, status)
```

## 🔔 Notifikácie a Alerty

### Pre Zamestnancov
- **GPS Alert**: "Si viac ako 100m od práce už 5 minút. Nezabudni sa odpipnúť!"
- **Obed Reminder**: "Obed trvá už 65 minút. Nezabudni sa vrátiť!"
- **Koniec Smeny**: "Pracovný čas skončil. Chceš sa odpipnúť?"

### Pre Adminov
- **Opustenie Zóny**: "Ján Novák opustil pracovisko bez odpipnutia"
- **Dlhý Obed**: "Mária Nová má obed už 90 minút"
- **Nová Korekcia**: "Peter Novotný požiadal o korekciu času"
- **Služobná Cesta**: "Anna Krásna požiadala o schválenie služobnej cesty"

## 📈 Dashboard a Reporty

### Live Dashboard
- **Mapa** s aktuálnymi pozíciami zamestnancov
- **Stav tímu** - kto je v práci, na obede, mimo
- **Dnešné štatistiky** - príchody, odchody, celkové hodiny
- **Aktívne alerty** s možnosťou riešenia

### Reporty
- **Mesačný prehľad** odpracovaných hodín
- **Porovnanie** plán vs. skutočnosť
- **Export** do CSV/Excel s filtrami
- **Mzdové podklady** s automatickým zaokrúhľovaním

## 🔒 Bezpečnosť a Súkromie

### Ochrana Dát
- **JWT tokeny** s krátkou expiry
- **Bcrypt** hashing hesiel
- **Rate limiting** na API endpoints
- **CORS** konfigurácia
- **SQL injection** ochrana cez Prisma ORM

### GDPR Compliance
- **Súhlas** s GPS sledovaním
- **Právo na výmaz** dát
- **Export** osobných údajov
- **Anonymizácia** po ukončení pracovného pomeru

### GPS Sledovanie
- Sledovanie **len počas pracovných hodín**
- **Geofencing** validácia pipnutí
- **Presnosť** GPS logov pre audit
- **Automatické vypnutie** po odpipnutí

## 📱 App Store Compliance

### Privacy Manifest (iOS 17+)
```xml
<!-- PrivacyInfo.xcprivacy -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePreciseLocation</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryLocation</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

### App Store Review Notes
```
REVIEW NOTES FOR APPLE:

This is an employee attendance tracking application designed for legitimate business use:

1. LOCATION USAGE:
   - Location is ONLY tracked during work hours (when clocked in)
   - Used for geofencing validation of clock in/out events
   - Prevents time theft and ensures employees are at designated work locations
   - Location tracking automatically STOPS when employee clocks out

2. BUSINESS JUSTIFICATION:
   - Replaces traditional time clocks and manual timesheets
   - Prevents buddy punching and location fraud
   - Required for accurate payroll and labor compliance
   - Used by legitimate businesses for workforce management

3. USER CONSENT:
   - Clear onboarding explains why location is needed
   - Users must explicitly consent to location tracking
   - Users can revoke permissions (but cannot use app without them)
   - Privacy policy clearly explains data usage and retention

4. DATA MINIMIZATION:
   - Only collects location during active work periods
   - No tracking during personal time or when off duty
   - Location data is used solely for attendance verification
   - Data is retained only as long as required for payroll/legal purposes

5. EMPLOYEE RIGHTS:
   - Employees are informed this is a work-related tracking app
   - Used only on company-provided devices or with employee consent
   - Complies with local labor laws and privacy regulations
   - Employees can request data deletion upon termination

This app serves a legitimate business need and follows all Apple guidelines for location-based employee tracking applications.
```

### Privacy Policy Template
```markdown
# Privacy Policy - Dochádzka Pro

## Data Collection
We collect location data ONLY when you are clocked in for work to:
- Verify you are at your designated workplace
- Prevent time fraud and ensure accurate payroll
- Send alerts if you leave work area without clocking out

## When We Track Location
- ONLY during work hours (when clocked in)
- NEVER during personal time or when clocked out
- Automatically stops when you clock out or end shift

## Data Usage
- Location data is used solely for attendance verification
- Shared only with your employer for payroll purposes
- Never sold to third parties or used for advertising
- Stored securely with encryption

## Your Rights
- Request data deletion upon employment termination
- Export your personal attendance data
- Revoke location permissions (app will not function)
- Contact us for data questions: privacy@attendance-pro.com

## Data Retention
- Location logs: 2 years (for payroll/legal compliance)
- Attendance records: 7 years (legal requirement)
- Personal data deleted upon request after employment ends

Last updated: [DATE]
```

### Location Permission Flow
```typescript
// Enhanced permission request with detailed explanations
const requestLocationPermission = async () => {
  // Step 1: Explain why we need location
  Alert.alert(
    "Povolenie polohy",
    "Táto aplikácia potrebuje prístup k vašej polohe pre:\n\n• Overenie že ste na pracovisku pri pipnutí\n• Upozornenie ak opustíte prácu bez odpipnutia\n• Presné sledovanie pracovného času\n\nVaša poloha sa sleduje LEN počas pracovných hodín.",
    [
      { text: "Zrušiť", style: "cancel" },
      { text: "Pokračovať", onPress: requestWhenInUse }
    ]
  );
};

const requestWhenInUse = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status === 'granted') {
    // Step 2: Explain background permission
    Alert.alert(
      "Sledovanie na pozadí",
      "Pre správne fungovanie potrebujeme sledovať polohu aj keď je aplikácia na pozadí. Toto nám umožní:\n\n• Upozorniť vás ak opustíte pracovisko\n• Automaticky ukončiť smenu pri odchode\n• Zabezpečiť presné záznamy\n\nSledovanie sa AUTOMATICKY vypne po odpipnutí z práce.",
      [
        { text: "Nie teraz", style: "cancel" },
        { text: "Povoliť", onPress: requestAlways }
      ]
    );
  }
};
```

### Geofencing Limitations Handling
```typescript
// Handle iOS 20 geofence limit
export class GeofenceManager {
  private static readonly MAX_GEOFENCES = 20;
  private static activeGeofences: Set<string> = new Set();
  
  static async addGeofence(region: GeofenceRegion) {
    if (this.activeGeofences.size >= this.MAX_GEOFENCES) {
      // Remove oldest geofence
      const oldestRegion = Array.from(this.activeGeofences)[0];
      await Location.stopGeofencingAsync(oldestRegion);
      this.activeGeofences.delete(oldestRegion);
    }
    
    await Location.startGeofencingAsync(region.identifier, region);
    this.activeGeofences.add(region.identifier);
  }
  
  static async optimizeGeofences(userLocation: LocationObject) {
    // Keep only nearby geofences active
    const nearbyRegions = await this.getNearbyRegions(userLocation);
    
    // Remove distant geofences
    for (const regionId of this.activeGeofences) {
      if (!nearbyRegions.includes(regionId)) {
        await Location.stopGeofencingAsync(regionId);
        this.activeGeofences.delete(regionId);
      }
    }
    
    // Add nearby geofences
    for (const regionId of nearbyRegions) {
      if (!this.activeGeofences.has(regionId)) {
        const region = await this.getRegionById(regionId);
        await this.addGeofence(region);
      }
    }
  }
}
```

### Battery Optimization
```typescript
// Smart location tracking based on context
export class SmartLocationService {
  static getOptimalLocationConfig(context: LocationContext) {
    const baseConfig = {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 100,
    };
    
    // Optimize based on battery level
    if (context.batteryLevel < 0.2) {
      return {
        ...baseConfig,
        accuracy: Location.Accuracy.Low,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 500, // 500 meters
      };
    }
    
    // Optimize based on movement
    if (context.isStationary) {
      return {
        ...baseConfig,
        timeInterval: 120000, // 2 minutes when not moving
      };
    }
    
    // High accuracy when near geofence boundary
    if (context.nearGeofenceBoundary) {
      return {
        ...baseConfig,
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 25, // 25 meters
      };
    }
    
    return baseConfig;
  }
}
```

## 🚀 Deployment

### Railway Deployment
1. **Pripoj Railway CLI**
2. **Nastav environment variables**
3. **Deploy backend**: `railway up`
4. **Nastav PostgreSQL** a Redis
5. **Spusti migrácie**: `railway run npm run db:migrate`

### Mobile App Distribution
1. **Development**: Expo Go / Development Build
2. **Testing**: TestFlight (iOS) / Internal Testing (Android)
3. **Production**: App Store / Google Play

## 📞 Podpora a Kontakt

Pre technickú podporu alebo otázky kontaktuj:
- **Email**: support@attendance-pro.com
- **GitHub Issues**: [Link to issues]
- **Dokumentácia**: [Link to docs]

---

## 📄 Licencia

MIT License - pozri [LICENSE](LICENSE) súbor pre detaily.

---

**Vyvinuté s ❤️ pre moderné firmy**
