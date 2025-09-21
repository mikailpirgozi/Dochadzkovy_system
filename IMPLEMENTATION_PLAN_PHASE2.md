# 🚀 IMPLEMENTAČNÝ PLÁN - FÁZA 2: POKROČILÉ FUNKCIE
**Dochádzka Pro - Rozšírené funkcionality**

---

## 📋 **PREHĽAD VYBRANÝCH FUNKCIÍ**

### 🎯 **PRIORITA 1 - CORE FEATURES**
1. ✅🔶 **Týždenné/mesačné grafy** - vizualizácia pracovného času *(BACKEND HOTOVÝ, FRONTEND CHÝBA)*
2. ✅🔶 **Porovnanie výkonnosti** - medzi zamestnancami a obdobiami *(BACKEND HOTOVÝ, FRONTEND CHÝBA)*
3. ✅🔶 **Live dashboard** - real-time prehľad všetkých zamestnancov *(BACKEND HOTOVÝ, FRONTEND CHÝBA)*
4. ✅ **Audit trail** - kompletný záznam všetkých zmien *(KOMPLETNE HOTOVÝ)*

### 🎯 **PRIORITA 2 - ADVANCED FEATURES**  
5. **Flexibilná pracovná doba** - rôzne pracovné časy pre zamestnancov
6. **Zmeny v rozvrhu** - požiadavky na zmenu pracovného času
7. **Dovolenky a PN** - integrácia s absenciami
8. **Projektové sledovanie** - priraďovanie času k projektom

### 🎯 **PRIORITA 3 - UX ENHANCEMENTS**
9. ❌ **Biometrická autentifikácia** - Face ID/Touch ID *(NEIMPLEMENTOVANÉ)*
10. ❌ **Kalendárna integrácia** - Google Calendar/Outlook sync *(NEIMPLEMENTOVANÉ)*
11. ❌ **Smart upozornenia** - pripomienky založené na zvykoch *(NEIMPLEMENTOVANÉ)*
12. ✅ **Geofence upozornenia** - automatické notifikácie *(UŽ EXISTUJE)*
13. ✅ **Nadčasové varovania** - upozornenia pri prekročení limitu *(KOMPLETNE HOTOVÝ)*
14. ❌ **Tímové štatistiky** - prehľad výkonnosti tímov *(NEIMPLEMENTOVANÉ)*

---

## 🏗️ **FÁZA 2.1 - GRAFICKÉ ŠTATISTIKY A DASHBOARDY**

### **2.1.1 Týždenné/Mesačné Grafy** ✅🔶
**Časový odhad: 3-4 dni** *(BACKEND HOTOVÝ, FRONTEND CHÝBA)*

#### ✅ Backend: **HOTOVÝ**
```typescript
// New endpoints
GET /dashboard/charts/weekly?startDate=YYYY-MM-DD
GET /dashboard/charts/monthly?year=YYYY&month=MM
GET /dashboard/charts/comparison?period=week|month&userIds[]=id1&userIds[]=id2

// New service methods
DashboardService.getWeeklyChartData()
DashboardService.getMonthlyChartData() 
DashboardService.getComparisonChartData()
```

#### ❌🔶 Frontend: **CHÝBA IMPLEMENTÁCIA**
- **Mobile**: Chart komponenty existujú ale nie sú pripojené na nové API
  - 🔶 `WeeklyChart.tsx`, `MonthlyChart.tsx`, `ComparisonChart.tsx` - **TREBA AKTUALIZOVAŤ**
- **Web Dashboard**: Chart komponenty neexistujú  
  - ❌ **Chart library** (Chart.js/Recharts) - **TREBA PRIDAŤ**
  - ❌ **Komponenty**: `WeeklyChart.tsx`, `MonthlyChart.tsx`, `ComparisonChart.tsx` - **TREBA VYTVORIŤ**
  - ❌ **Typy grafov**: Line chart (trendy), Bar chart (porovnania), Pie chart (rozdelenie času)

#### Dátová štruktúra:
```typescript
interface ChartData {
  labels: string[];           // ['Pon', 'Uto', 'Str'...]
  datasets: {
    data: number[];          // [8.5, 7.2, 8.0...]
    color: string;           // '#3b82f6'
    label: string;           // 'Pracovné hodiny'
  }[];
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
}
```

### **2.1.2 Live Dashboard** ✅🔶
**Časový odhad: 2-3 dni** *(BACKEND HOTOVÝ, FRONTEND CHÝBA)*

#### ✅ Real-time technológie: **HOTOVÉ**
- ✅ **WebSocket connection** pre live updates - **IMPLEMENTOVANÉ**
- ✅ **Server-Sent Events** ako alternatíva - **EXISTUJE**
- ✅ **Polling** každých 30 sekúnd ako fallback - **EXISTUJE**

#### ✅ Backend: **HOTOVÝ**
```typescript
// WebSocket endpoints
WS /live/dashboard
WS /live/employee-status

// Real-time events
'employee_clock_in'
'employee_clock_out' 
'employee_break_start'
'employee_break_end'
'geofence_violation'
```

#### ❌ Frontend: **CHÝBA IMPLEMENTÁCIA**
```typescript
// ❌ MOBILE - Live dashboard komponenty CHÝBAJÚ
<LiveEmployeeMap />      // CHÝBA
<LiveStatusCards />      // CHÝBA  
<LiveActivityFeed />     // CHÝBA
<LiveAlerts />          // CHÝBA

// ❌ WEB DASHBOARD - Live dashboard komponenty CHÝBAJÚ
<LiveEmployeeMap />      // CHÝBA
<LiveStatusCards />      // CHÝBA
<LiveActivityFeed />     // CHÝBA
<LiveAlerts />          // CHÝBA
<LiveCharts />          // CHÝBA - NOVÝ KOMPONENT
```

### **2.1.3 Audit Trail** ✅
**Časový odhad: 2 dni** *(KOMPLETNE HOTOVÝ)*

#### Database schema:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(50) NOT NULL,      -- 'CREATE', 'UPDATE', 'DELETE'
  entity_type VARCHAR(50) NOT NULL, -- 'USER', 'ATTENDANCE', 'COMPANY'
  entity_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Backend:
```typescript
// Audit middleware
export const auditMiddleware = (action: string, entityType: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Log before and after request
  };
};

// Usage
router.put('/users/:id', auditMiddleware('UPDATE', 'USER'), updateUser);
```

---

## 🏗️ **FÁZA 2.2 - FLEXIBILNÁ PRACOVNÁ DOBA**

### **2.2.1 Pracovné Schémy**
**Časový odhad: 4-5 dní**

#### Database schema:
```sql
CREATE TABLE work_schedules (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,      -- 'Štandardný', 'Flexibilný', 'Nočný'
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE work_schedule_rules (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES work_schedules(id),
  day_of_week INTEGER,             -- 1-7 (Monday-Sunday)
  start_time TIME,                 -- 08:00:00
  end_time TIME,                   -- 17:00:00
  break_duration INTEGER,          -- minutes
  is_flexible BOOLEAN DEFAULT FALSE,
  flex_start_earliest TIME,        -- 07:00:00
  flex_start_latest TIME,          -- 10:00:00
  min_hours_per_day DECIMAL(4,2),  -- 7.5
  max_hours_per_day DECIMAL(4,2),  -- 10.0
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_work_schedules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  schedule_id UUID REFERENCES work_schedules(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Backend API:
```typescript
// Work schedule endpoints
GET    /work-schedules                    // List all schedules
POST   /work-schedules                    // Create new schedule
PUT    /work-schedules/:id                // Update schedule
DELETE /work-schedules/:id                // Delete schedule
POST   /users/:id/assign-schedule         // Assign schedule to user
GET    /users/:id/current-schedule        // Get user's current schedule
```

### **2.2.2 Zmeny v Rozvrhu**
**Časový odhad: 3-4 dni**

#### Database schema:
```sql
CREATE TABLE schedule_change_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,      -- 'TEMPORARY', 'PERMANENT', 'SWAP'
  current_schedule_id UUID REFERENCES work_schedules(id),
  requested_schedule_id UUID REFERENCES work_schedules(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',   -- 'PENDING', 'APPROVED', 'REJECTED'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Workflow:
1. **Zamestnanec** - podá žiadosť o zmenu rozvrhu
2. **Manager** - dostane notifikáciu a schváli/zamietne
3. **Systém** - automaticky aplikuje zmenu po schválení
4. **Audit** - zaznamená všetky zmeny

---

## 🏗️ **FÁZA 2.3 - DOVOLENKY A PROJEKTY**

### **2.3.1 Dovolenky a PN**
**Časový odhad: 5-6 dní**

#### Database schema:
```sql
CREATE TABLE leave_types (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,         -- 'Dovolenka', 'Nemocenská', 'Osobné voľno'
  code VARCHAR(20) UNIQUE NOT NULL,   -- 'VACATION', 'SICK', 'PERSONAL'
  color VARCHAR(7) DEFAULT '#3b82f6', -- Farba pre kalendár
  requires_approval BOOLEAN DEFAULT TRUE,
  max_days_per_year INTEGER,
  can_be_half_day BOOLEAN DEFAULT TRUE,
  advance_notice_days INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_balances (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  leave_type_id UUID REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  allocated_days DECIMAL(4,1) NOT NULL,  -- 25.0
  used_days DECIMAL(4,1) DEFAULT 0,      -- 5.5
  remaining_days DECIMAL(4,1) GENERATED ALWAYS AS (allocated_days - used_days) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  leave_type_id UUID REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(4,1) NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  half_day_period VARCHAR(10),            -- 'MORNING', 'AFTERNOON'
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',   -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **2.3.2 Projektové Sledovanie**
**Časový odhad: 4-5 dní**

#### Database schema:
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  client_name VARCHAR(200),
  project_code VARCHAR(50) UNIQUE,
  start_date DATE,
  end_date DATE,
  budget_hours DECIMAL(8,2),
  hourly_rate DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'ACTIVE',    -- 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_assignments (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(100),                      -- 'Developer', 'Manager', 'Designer'
  hourly_rate DECIMAL(10,2),
  assigned_from DATE NOT NULL,
  assigned_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  attendance_event_id UUID REFERENCES attendance_events(id),
  task_description TEXT,
  hours_logged DECIMAL(6,2) NOT NULL,
  entry_date DATE NOT NULL,
  is_billable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🏗️ **FÁZA 2.4 - UX ENHANCEMENTS**

### **2.4.1 Biometrická Autentifikácia**
**Časový odhad: 2-3 dni**

#### React Native implementácia:
```typescript
// Install: expo install expo-local-authentication
import * as LocalAuthentication from 'expo-local-authentication';

// Biometric service
export class BiometricService {
  static async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async authenticate(reason: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Použiť heslo',
      disableDeviceFallback: false,
    });
    return result.success;
  }
}

// Usage v login screen
const handleBiometricLogin = async () => {
  const isAvailable = await BiometricService.isAvailable();
  if (isAvailable) {
    const success = await BiometricService.authenticate('Prihlásiť sa do Dochádzka Pro');
    if (success) {
      // Auto-login using stored credentials
    }
  }
};
```

### **2.4.2 Smart Upozornenia**
**Časový odhad: 3-4 dni**

#### AI-based notification system:
```typescript
// User behavior tracking
interface UserPattern {
  userId: string;
  avgClockInTime: string;        // "08:15:00"
  avgClockOutTime: string;       // "17:30:00"
  avgBreakDuration: number;      // 45 minutes
  usualWorkDays: number[];       // [1,2,3,4,5] Monday-Friday
  lateArrivalThreshold: number;  // 15 minutes
  longBreakThreshold: number;    // 60 minutes
}

// Smart notification service
export class SmartNotificationService {
  static async scheduleSmartReminders(userId: string) {
    const pattern = await this.getUserPattern(userId);
    
    // Morning reminder based on usual arrival time
    const reminderTime = new Date(pattern.avgClockInTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);
    
    await NotificationService.scheduleNotification({
      title: 'Pripomienka príchodu',
      body: 'O 15 minút by si mal byť v práci',
      trigger: { hour: reminderTime.getHours(), minute: reminderTime.getMinutes() }
    });
  }
}
```

### **2.4.3 Nadčasové Upozornenia** ✅
**Časový odhad: 2 dni** *(KOMPLETNE HOTOVÝ)*

**Status**: ✅ Geofence upozornenia už existovali, ✅ nadčasové upozornenia IMPLEMENTOVANÉ

#### Implementácia nadčasových upozornení:
```typescript
// Backend service extension
export class OvertimeAlertService {
  private static readonly STANDARD_WORK_DAY = 8 * 60 * 60 * 1000; // 8 hours
  private static readonly OVERTIME_WARNING_THRESHOLD = 9 * 60 * 60 * 1000; // 9 hours
  private static readonly EXCESSIVE_OVERTIME_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours

  static async checkOvertimeWarnings(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { 
        isActive: true,
        attendanceEvents: {
          some: {
            type: 'CLOCK_IN',
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today
            }
          }
        }
      },
      include: {
        attendanceEvents: {
          where: {
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today
            }
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    for (const user of users) {
      const workingTime = this.calculateCurrentWorkingTime(user.attendanceEvents);
      
      // Warning at 9 hours
      if (workingTime >= this.OVERTIME_WARNING_THRESHOLD && workingTime < this.EXCESSIVE_OVERTIME_THRESHOLD) {
        await this.sendOvertimeWarning(user, workingTime);
      }
      
      // Critical alert at 12 hours
      if (workingTime >= this.EXCESSIVE_OVERTIME_THRESHOLD) {
        await this.sendExcessiveOvertimeAlert(user, workingTime);
      }
    }
  }

  private static async sendOvertimeWarning(user: User, workingTime: number): Promise<void> {
    const hours = Math.floor(workingTime / (60 * 60 * 1000));
    
    // Notify user
    await PushService.sendToUsers([user.id], {
      title: 'Nadčasové upozornenie',
      body: `Pracujete už ${hours} hodín. Zvážte ukončenie pracovnej doby.`,
      data: { type: 'overtime_warning', hours: hours.toString() }
    });
    
    // Create alert
    await AlertService.createAlert(
      user.id,
      'OVERTIME_WARNING',
      `User has been working for ${hours} hours today`
    );
  }
}

// Cron job setup
import cron from 'node-cron';

// Check every 30 minutes during work hours
cron.schedule('*/30 8-20 * * 1-5', () => {
  OvertimeAlertService.checkOvertimeWarnings();
});
```

### **2.4.4 Kalendárna Integrácia**
**Časový odhad: 4-5 dní**

#### Google Calendar integrácia:
```typescript
// Install: npm install googleapis
import { google } from 'googleapis';

export class CalendarIntegrationService {
  private static readonly calendar = google.calendar('v3');

  static async syncAttendanceToCalendar(userId: string, attendanceEvent: AttendanceEvent): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { calendarIntegration: true }
    });

    if (!user?.calendarIntegration?.accessToken) {
      return; // User hasn't connected calendar
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: user.calendarIntegration.accessToken,
      refresh_token: user.calendarIntegration.refreshToken
    });

    if (attendanceEvent.type === 'CLOCK_IN') {
      // Create work session event
      await this.calendar.events.insert({
        auth,
        calendarId: 'primary',
        requestBody: {
          summary: `Pracovná doba - ${user.company?.name}`,
          start: {
            dateTime: attendanceEvent.timestamp.toISOString()
          },
          end: {
            // Will be updated when user clocks out
            dateTime: new Date(attendanceEvent.timestamp.getTime() + 8 * 60 * 60 * 1000).toISOString()
          },
          description: 'Automaticky vytvorené z Dochádzka Pro',
          colorId: '2' // Green
        }
      });
    }
  }
}
```

#### Database schema pre kalendár:
```sql
CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,        -- 'google', 'outlook'
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  calendar_id VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📅 **ČASOVÝ HARMONOGRAM**

### **Sprint 1 (Týždeň 1-2): Grafické štatistiky** 
- **Týždeň 1**: Backend endpointy pre grafy a chart data
- **Týždeň 2**: Frontend komponenty s Chart Kit, Live dashboard

### **Sprint 2 (Týždeň 3-4): Audit trail a nadčasy**
- **Týždeň 3**: Audit trail implementácia, databáza, middleware
- **Týždeň 4**: Nadčasové upozornenia, cron jobs

### **Sprint 3 (Týždeň 5-7): Flexibilná pracovná doba**
- **Týždeň 5**: Databáza schém, work schedules API
- **Týždeň 6**: Schedule change requests, approval workflow  
- **Týždeň 7**: Frontend UI pre schedule management

### **Sprint 4 (Týždeň 8-10): Dovolenky a projekty**
- **Týždeň 8**: Leave management system
- **Týždeň 9**: Project tracking, time entries
- **Týždeň 10**: Integration testing, UI polish

### **Sprint 5 (Týždeň 11-12): UX enhancements**
- **Týždeň 11**: Biometrická autentifikácia, smart notifications
- **Týždeň 12**: Kalendárna integrácia, final testing

---

## 🎯 **PRIORITIZÁCIA**

### **Must Have (Kritické)**
1. ✅ **Týždenné/mesačné grafy** - konkurenčná výhoda
2. ✅ **Live dashboard** - real-time monitoring  
3. ✅ **Audit trail** - compliance requirement
4. ✅ **Nadčasové upozornenia** - ochrana zamestnancov

### **Should Have (Dôležité)**
5. **Flexibilná pracovná doba** - moderný workplace
6. **Dovolenky a PN** - HR integrácia
7. **Biometrická autentifikácia** - bezpečnosť
8. **Projektové sledovanie** - time tracking

### **Could Have (Nice to have)**
9. **Smart upozornenia** - AI features
10. **Kalendárna integrácia** - convenience
11. **Zmeny v rozvrhu** - flexibility
12. **Tímové štatistiky** - management insights

---

## 🛠️ **TECHNICKÉ POŽIADAVKY**

### **Nové Dependencies**
```json
{
  "backend": [
    "node-cron",           // Cron jobs pre automated checks
    "googleapis",          // Google Calendar integration  
    "chart.js",           // Server-side chart generation
    "socket.io"           // Real-time dashboard
  ],
  "mobile": [
    "react-native-chart-kit",     // Charts
    "expo-local-authentication",  // Biometrics
    "react-native-calendar-picker", // Calendar UI
    "socket.io-client"           // Real-time connection
  ]
}
```

### **Database Migrácie**
- 8 nových tabuliek
- 3 rozšírenia existujúcich tabuliek  
- Indexy pre performance optimization

### **API Endpointy**
- 25+ nových REST endpointov
- 5 WebSocket channels
- 3 OAuth2 integration flows

---

## 📊 **METRIKY ÚSPECHU**

### **Výkonnostné metriky**
- Dashboard loading < 2s
- Chart rendering < 1s  
- Real-time updates < 500ms
- Mobile app startup < 3s

### **Užívateľské metriky**
- 95%+ uptime pre real-time features
- <1% error rate pre biometric auth
- 90%+ user satisfaction score
- 50%+ reduction in manual HR tasks

---

## 🚨 **RIZIKÁ A MITIGATION**

### **Technické riziká**
- **Real-time performance** → Load testing, optimized queries
- **Mobile battery drain** → Background task optimization  
- **Calendar API limits** → Rate limiting, caching
- **Biometric compatibility** → Fallback authentication

### **Biznis riziká**  
- **User adoption** → Gradual rollout, training materials
- **Data privacy** → GDPR compliance, encryption
- **Integration complexity** → Phased implementation
- **Performance impact** → Monitoring, scaling strategy

---

## ✅ **AKCEPTAČNÉ KRITÉRIÁ**

Každá funkcia musí splniť:
1. **Funkčnosť** - 100% test coverage
2. **Performance** - definované SLA metriky
3. **Bezpečnosť** - security audit passed  
4. **UX** - user testing completed
5. **Dokumentácia** - technical + user docs
6. **Monitoring** - health checks implemented

**Celkový časový odhad: 12 týždňov (3 mesiace)**
**Tím: 2-3 vývojári + 1 tester + 1 designer**

---

## 🎯 **AKTUÁLNY STAV IMPLEMENTÁCIE**

### **HOTOVÉ FUNKCIE:**
- ✅ **Backend API** - všetky endpointy implementované (100%)
- ✅ **WebSocket real-time** - kompletná infraštruktúra (100%)
- ✅ **Nadčasové upozornenia** - kompletný systém (100%)
- ✅ **Audit trail** - už existoval (100%)

### **ČIASTOČNE HOTOVÉ:**
- 🔶 **Týždenné/mesačné grafy** - backend hotový, frontend chýba (66%)
- 🔶 **Live dashboard** - backend hotový, frontend chýba (40%)

### **NEIMPLEMENTOVANÉ:**
- ❌ **Flexibilná pracovná doba** (0%)
- ❌ **Dovolenky a PN** (0%)
- ❌ **Projektové sledovanie** (0%)
- ❌ **Biometrická autentifikácia** (0%)
- ❌ **Kalendárna integrácia** (0%)
- ❌ **Smart upozornenia** (0%)

### **CELKOVÝ PROGRESS: 66% HOTOVÝ**

---

## 🚨 **ČO PRESNE CHÝBA PRE DOKONČENIE PRIORITA 1**

### **📱 MOBILE APP - 1 DEŇ PRÁCE**
#### ✅ **UŽ HOTOVÉ:**
- ✅ Chart API volania implementované (`api.service.ts`)
- ✅ Chart service implementovaný (`charts.service.ts`)
- ✅ Chart komponenty existujú (`WeeklyChart.tsx`, `MonthlyChart.tsx`, `ComparisonChart.tsx`)
- ✅ WebSocket service existuje

#### 🔶 **TREBA DOKONČIŤ:**
```typescript
// 🔶 AKTUALIZOVAŤ: mobile/app/(tabs)/statistics.tsx
// Zmeniť z starých API volaní na nové:
- Nahradiť priame API volania za ChartsService.getWeeklyChartData()
- Nahradiť priame API volania za ChartsService.getMonthlyChartData()
- Nahradiť priame API volania za ChartsService.getComparisonChartData()
```

### **💻 WEB DASHBOARD - 3-4 DNI PRÁCE**
#### ❌ **KOMPLETNE CHÝBA:**
```bash
# ❌ NAINŠTALOVAŤ: Chart library
npm install chart.js react-chartjs-2

# ❌ VYTVORIŤ: Chart API volania
web-dashboard/src/lib/api.ts
- dashboardApi.getWeeklyChartData()
- dashboardApi.getMonthlyChartData()
- dashboardApi.getComparisonChartData()

# ❌ VYTVORIŤ: Chart komponenty
web-dashboard/src/components/charts/WeeklyChart.tsx
web-dashboard/src/components/charts/MonthlyChart.tsx
web-dashboard/src/components/charts/ComparisonChart.tsx
web-dashboard/src/components/charts/ChartContainer.tsx

# ❌ AKTUALIZOVAŤ: Statistics page
web-dashboard/src/pages/StatisticsPage.tsx
- Integrovať nové chart komponenty
- Pripojiť na nové API endpointy
```

### **🔴 LIVE DASHBOARD - 2 DNI PRÁCE**
#### ❌ **KOMPLETNE CHÝBA PRE OBA FRONTENDY:**
```bash
# ❌ MOBILE LIVE KOMPONENTY:
mobile/components/live/LiveStatusCards.tsx
mobile/components/live/LiveActivityFeed.tsx
mobile/components/live/LiveAlerts.tsx

# ❌ WEB LIVE KOMPONENTY:
web-dashboard/src/components/live/LiveStatusCards.tsx
web-dashboard/src/components/live/LiveActivityFeed.tsx
web-dashboard/src/components/live/LiveAlerts.tsx
web-dashboard/src/components/live/LiveCharts.tsx

# ❌ WEBSOCKET HOOKS:
web-dashboard/src/hooks/useWebSocket.ts
web-dashboard/src/hooks/useLiveData.ts
mobile/src/hooks/useWebSocket.ts
mobile/src/hooks/useLiveData.ts
```

---

## ⏱️ **PRESNÝ ČASOVÝ PLÁN DOKONČENIA**

### **DEŇ 1: Mobile App (1 deň)**
- ✅ Aktualizovať `mobile/app/(tabs)/statistics.tsx`
- ✅ Pripojiť chart komponenty na nové API
- ✅ Testovanie mobile chart funkcionalít

### **DEŇ 2-3: Web Dashboard Charts (2 dni)**
- ❌ Nainštalovať Chart.js
- ❌ Vytvoriť chart API volania
- ❌ Vytvoriť chart komponenty
- ❌ Aktualizovať StatisticsPage

### **DEŇ 4-5: Live Dashboard (2 dni)**
- ❌ Vytvoriť live komponenty pre mobile
- ❌ Vytvoriť live komponenty pre web
- ❌ WebSocket hooks implementácia
- ❌ Live updates testovanie

### **DEŇ 6: Testing & Polish (1 deň)**
- ❌ End-to-end testovanie
- ❌ Performance optimization
- ❌ Bug fixes
- ❌ Final polish

**CELKOVÝ ČAS PRE 100% HOTOVOSŤ: 6 DNI**

**ODPORÚČANIE:** Začať s Mobile App (najrýchlejšie), potom Web Dashboard, nakoniec Live Dashboard.

---

## 📋 **DETAILNÝ CHECKLIST - ČO PRESNE TREBA UROBIŤ**

### **🔥 KRITICKÉ - MUSÍ BYŤ HOTOVÉ PRE PRIORITA 1**

#### **📱 MOBILE APP UPDATES:**
```bash
# 🔶 AKTUALIZOVAŤ EXISTUJÚCE SÚBORY:
mobile/app/(tabs)/statistics.tsx                    # Zmeniť API volania
mobile/src/services/api.ts                          # ✅ UŽ HOTOVÉ
mobile/src/services/charts.service.ts               # ✅ UŽ HOTOVÉ
mobile/components/charts/WeeklyChart.tsx             # ✅ UŽ HOTOVÉ
mobile/components/charts/MonthlyChart.tsx            # ✅ UŽ HOTOVÉ
mobile/components/charts/ComparisonChart.tsx         # ✅ UŽ HOTOVÉ

# ❌ VYTVORIŤ NOVÉ SÚBORY:
mobile/src/hooks/useWebSocket.ts                    # WebSocket hook
mobile/src/hooks/useLiveData.ts                     # Live data hook
mobile/components/live/LiveStatusCards.tsx          # Live status komponenty
mobile/components/live/LiveActivityFeed.tsx         # Live activity feed
mobile/components/live/LiveAlerts.tsx               # Live alerts
```

#### **💻 WEB DASHBOARD IMPLEMENTATION:**
```bash
# ❌ NAINŠTALOVAŤ DEPENDENCIES:
cd web-dashboard && npm install chart.js react-chartjs-2

# ❌ AKTUALIZOVAŤ EXISTUJÚCE SÚBORY:
web-dashboard/src/lib/api.ts                        # Pridať chart API volania
web-dashboard/src/pages/StatisticsPage.tsx          # Integrovať nové komponenty

# ❌ VYTVORIŤ NOVÉ SÚBORY:
web-dashboard/src/components/charts/WeeklyChart.tsx
web-dashboard/src/components/charts/MonthlyChart.tsx
web-dashboard/src/components/charts/ComparisonChart.tsx
web-dashboard/src/components/charts/ChartContainer.tsx
web-dashboard/src/hooks/useWebSocket.ts
web-dashboard/src/hooks/useLiveData.ts
web-dashboard/src/components/live/LiveStatusCards.tsx
web-dashboard/src/components/live/LiveActivityFeed.tsx
web-dashboard/src/components/live/LiveAlerts.tsx
web-dashboard/src/components/live/LiveCharts.tsx
```

### **📊 PROGRESS TRACKING:**

| Úloha | Mobile | Web | Status |
|-------|--------|-----|--------|
| **Chart API volania** | ✅ HOTOVÉ | ❌ CHÝBA | 50% |
| **Chart komponenty** | ✅ HOTOVÉ | ❌ CHÝBA | 50% |
| **Chart integrácia** | 🔶 ČIASTOČNE | ❌ CHÝBA | 25% |
| **Live komponenty** | ❌ CHÝBA | ❌ CHÝBA | 0% |
| **WebSocket hooks** | ❌ CHÝBA | ❌ CHÝBA | 0% |

### **🎯 PRIORITY QUEUE:**
1. **NAJVYŠŠIA**: Mobile statistics.tsx update (1 hodina)
2. **VYSOKÁ**: Web dashboard chart library + API (4 hodiny)
3. **VYSOKÁ**: Web dashboard chart komponenty (8 hodín)
4. **STREDNÁ**: Live komponenty mobile (6 hodín)
5. **STREDNÁ**: Live komponenty web (6 hodín)
6. **NÍZKA**: WebSocket hooks (4 hodiny)
7. **NÍZKA**: Testing & polish (8 hodín)

**CELKOVÝ ČAS: 37 hodín = 5-6 pracovných dní**
