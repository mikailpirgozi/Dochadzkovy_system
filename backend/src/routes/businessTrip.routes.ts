import { Router } from 'express';
import { authMiddleware, requireEmployee, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { BusinessTripController } from '../controllers/businessTrip.controller.js';

const router = Router();
const businessTripController = new BusinessTripController();

router.use(authMiddleware);

// Employee endpoints
router.post('/', requireEmployee, (authenticatedAsyncHandler(businessTripController.createBusinessTrip) as any));
router.get('/my', requireEmployee, (authenticatedAsyncHandler(businessTripController.getMyBusinessTrips) as any));
router.get('/active', requireEmployee, (authenticatedAsyncHandler(businessTripController.getActiveBusinessTrips) as any));
router.put('/:id/start', requireEmployee, (authenticatedAsyncHandler(businessTripController.startBusinessTrip) as any));
router.put('/:id/end', requireEmployee, (authenticatedAsyncHandler(businessTripController.endBusinessTrip) as any));
router.put('/:id/cancel', requireEmployee, (authenticatedAsyncHandler(businessTripController.cancelBusinessTrip) as any));

// Manager/Admin endpoints
router.get('/', requireManager, (authenticatedAsyncHandler(businessTripController.getBusinessTrips) as any));
router.get('/stats', requireManager, (authenticatedAsyncHandler(businessTripController.getBusinessTripStats) as any));
router.get('/:id', (authenticatedAsyncHandler(businessTripController.getBusinessTripById) as any));
router.put('/:id/approve', requireManager, (authenticatedAsyncHandler(businessTripController.approveBusinessTrip) as any));
router.put('/:id/reject', requireManager, (authenticatedAsyncHandler(businessTripController.rejectBusinessTrip) as any));

export default router;