import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireEmployee } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { auditMiddlewares } from '../middleware/audit.middleware.js';
import { AttendanceController } from '../controllers/attendance.controller.js';

const router = Router();

// Validation schemas
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime().optional(),
});

const ClockInSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  location: LocationSchema,
  notes: z.string().optional(),
});

const ClockOutSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  location: LocationSchema,
  notes: z.string().optional(),
});

const BreakStartSchema = z.object({
  type: z.enum(['BREAK', 'PERSONAL']),
  location: LocationSchema,
  notes: z.string().optional(),
});

const BreakEndSchema = z.object({
  location: LocationSchema,
  notes: z.string().optional(),
});

const ValidateQRSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  location: LocationSchema,
});

const EventsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
});

// All routes require authentication
router.use(authMiddleware);
router.use(requireEmployee);

// Clock in/out routes with validation and audit
router.post(
  '/clock-in', 
  validateRequest({ body: ClockInSchema }),
  auditMiddlewares.clockIn as any,
  AttendanceController.clockIn as any
);

router.post(
  '/clock-out', 
  validateRequest({ body: ClockOutSchema }),
  auditMiddlewares.clockOut as any,
  AttendanceController.clockOut as any
);

// Break management routes with validation and audit
router.post(
  '/break-start', 
  validateRequest({ body: BreakStartSchema }),
  auditMiddlewares.breakStart as any,
  AttendanceController.startBreak as any
);

router.post(
  '/break-end', 
  validateRequest({ body: BreakEndSchema }),
  auditMiddlewares.breakEnd as any,
  AttendanceController.endBreak as any
);

// Status and events routes
router.get('/status', AttendanceController.getStatus as any);

router.get(
  '/events', 
  validateRequest({ query: EventsQuerySchema }),
  AttendanceController.getEvents as any
);

// QR validation route with validation
router.post(
  '/validate-qr', 
  validateRequest({ body: ValidateQRSchema }),
  AttendanceController.validateQR as any
);

// Location tracking route with validation
router.post(
  '/location', 
  validateRequest({ body: LocationSchema }),
  AttendanceController.updateLocation as any
);

// Additional routes for Phase 3

// Get current location status
router.get('/location-status', AttendanceController.getLocationStatus as any);

// Report GPS issues
router.post(
  '/gps-issue', 
  validateRequest({ 
    body: z.object({
      issue: z.string().min(1, 'Issue description is required'),
      location: LocationSchema.optional(),
    })
  }),
  AttendanceController.reportGPSIssue as any
);

// Get geofence status
router.get('/geofence-status', AttendanceController.getGeofenceStatus as any);

export default router;
