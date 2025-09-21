import { Router } from 'express';
import { 
  authMiddleware, 
  requireCompanyAdmin, 
  requireEmployee,
  tenantMiddleware,
  requireCompanyAccess 
} from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { userController } from '../controllers/user.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireCompanyAccess);

// Admin routes
router.get('/', requireCompanyAdmin, (authenticatedAsyncHandler(userController.getAllUsers.bind(userController)) as any));
router.post('/', requireCompanyAdmin, (authenticatedAsyncHandler(userController.createUser.bind(userController)) as any));
router.patch('/bulk', requireCompanyAdmin, (authenticatedAsyncHandler(userController.bulkUpdateUsers.bind(userController)) as any));

// User-specific routes (employees can access their own data)
router.get('/:id', requireEmployee, (authenticatedAsyncHandler(userController.getUser.bind(userController)) as any));
router.put('/:id', requireEmployee, (authenticatedAsyncHandler(userController.updateUser.bind(userController)) as any));
router.delete('/:id', requireCompanyAdmin, (authenticatedAsyncHandler(userController.deleteUser.bind(userController)) as any));

// Admin-only user management
router.patch('/:id/password', requireCompanyAdmin, (authenticatedAsyncHandler(userController.changeUserPassword.bind(userController)) as any));
router.patch('/:id/device', requireEmployee, (authenticatedAsyncHandler(userController.updateUserDevice.bind(userController)) as any));

// Attendance summary (employees can see their own)
router.get('/:id/attendance/summary', requireEmployee, (authenticatedAsyncHandler(userController.getUserAttendanceSummary.bind(userController)) as any));

// Push notification routes
router.post('/push-token', requireEmployee, (authenticatedAsyncHandler(userController.updatePushToken.bind(userController)) as any));
router.delete('/push-token', requireEmployee, (authenticatedAsyncHandler(userController.removePushToken.bind(userController)) as any));

// Notification preferences routes
router.get('/notification-preferences', requireEmployee, (authenticatedAsyncHandler(userController.getNotificationPreferences.bind(userController)) as any));
router.put('/notification-preferences', requireEmployee, (authenticatedAsyncHandler(userController.updateNotificationPreferences.bind(userController)) as any));
router.post('/notification-preferences/reset', requireEmployee, (authenticatedAsyncHandler(userController.resetNotificationPreferences.bind(userController)) as any));
router.post('/notification-preferences/enable-all', requireEmployee, (authenticatedAsyncHandler(userController.enableAllNotifications.bind(userController)) as any));
router.post('/notification-preferences/disable-all', requireEmployee, (authenticatedAsyncHandler(userController.disableAllNotifications.bind(userController)) as any));

// Admin only - company notification summary
router.get('/notification-summary', requireCompanyAdmin, (authenticatedAsyncHandler(userController.getCompanyNotificationSummary.bind(userController)) as any));

// Development only - test notification
if (process.env.NODE_ENV === 'development') {
  router.post('/test-notification', requireEmployee, (authenticatedAsyncHandler(userController.sendTestNotification.bind(userController)) as any));
}

export default router;
