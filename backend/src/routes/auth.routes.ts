import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { tenantMiddleware, authMiddleware } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Public routes (no authentication _required)
router.post('/login', tenantMiddleware, authController.login as any);
router.post('/register', tenantMiddleware, authController.register as any);
router.post('/refresh', authController.refreshToken as any);
router.post('/forgot-password', tenantMiddleware, authController.forgotPassword as any);
router.post('/reset-password', tenantMiddleware, authController.resetPassword as any);

// Protected routes (authentication _required)
router.post('/logout', authMiddleware, authController.logout as any);
router.get('/me', authMiddleware, authController.getProfile as any);
router.put('/me', authMiddleware, authController.updateProfile as any);
router.put('/change-password', authMiddleware, authController.changePassword as any);
router.put('/device', authMiddleware, (authenticatedAsyncHandler(authController.updateDevice) as any));

export default router;
