import { Router } from 'express';
import { 
  authMiddleware, 
  requireSuperAdmin, 
  requireCompanyAdmin,
  requireCompanyAccess,
  tenantMiddleware,
  requireManager
} from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { companyController } from '../controllers/company.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

// Public routes
router.get('/validate/:slug', companyController.validateCompany as any);

// Protected routes
router.use(authMiddleware);

// Super admin routes
router.get('/', requireSuperAdmin, (authenticatedAsyncHandler(companyController.getAllCompanies.bind(companyController)) as any));
router.post('/', requireSuperAdmin, (authenticatedAsyncHandler(companyController.createCompany.bind(companyController)) as any));
router.delete('/:id', requireSuperAdmin, (authenticatedAsyncHandler(companyController.deleteCompany.bind(companyController)) as any));

// Company-specific routes (require company context)
router.get('/:id', (authenticatedAsyncHandler(companyController.getCompany.bind(companyController)) as any));
router.put('/:id', requireCompanyAdmin, (authenticatedAsyncHandler(companyController.updateCompany.bind(companyController)) as any));

// Company admin routes (with tenant middleware)
router.use(tenantMiddleware);
router.use(requireCompanyAccess);

router.get('/stats/overview', requireCompanyAdmin, (authenticatedAsyncHandler(companyController.getCompanyStats.bind(companyController)) as any));
router.post('/qr/regenerate', requireCompanyAdmin, (authenticatedAsyncHandler(companyController.regenerateQRCode.bind(companyController)) as any));

// Live employee locations (accessible by managers and above)
router.get('/:companyId/employees/live-locations', requireManager, (authenticatedAsyncHandler(DashboardController.getLiveEmployeeLocations) as any));

export default router;
