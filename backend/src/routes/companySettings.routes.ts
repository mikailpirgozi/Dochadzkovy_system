import { Router } from 'express';
import { authMiddleware, requireCompanyAdmin } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { CompanySettingsController } from '../controllers/companySettings.controller.js';

const router = Router();
const companySettingsController = new CompanySettingsController();

router.use(authMiddleware);

// Company settings endpoints (admin only)
router.get('/', requireCompanyAdmin, (authenticatedAsyncHandler(companySettingsController.getCompanySettings) as any));
router.put('/', requireCompanyAdmin, (authenticatedAsyncHandler(companySettingsController.updateCompanySettings) as any));
router.post('/reset', requireCompanyAdmin, (authenticatedAsyncHandler(companySettingsController.resetCompanySettings) as any));

// Working hours endpoints (accessible to all authenticated users)
router.get('/working-hours', (authenticatedAsyncHandler(companySettingsController.getWorkingHours) as any));
router.get('/is-working-time', (authenticatedAsyncHandler(companySettingsController.isWorkingTime) as any));
router.get('/expected-hours', (authenticatedAsyncHandler(companySettingsController.getExpectedWorkingHours) as any));

export default router;
