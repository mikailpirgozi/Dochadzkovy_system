import { Router } from 'express';
import { authMiddleware, requireEmployee, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { CorrectionController } from '../controllers/correction.controller.js';

const router = Router();
const correctionController = new CorrectionController();

router.use(authMiddleware);

// Employee endpoints
router.post('/', requireEmployee, (authenticatedAsyncHandler(correctionController.createCorrection) as any));
router.get('/my', requireEmployee, (authenticatedAsyncHandler(correctionController.getMyCorrections) as any));
router.delete('/:id', requireEmployee, (authenticatedAsyncHandler(correctionController.cancelCorrection) as any));

// Manager/Admin endpoints
router.get('/', requireManager, (authenticatedAsyncHandler(correctionController.getCorrections) as any));
router.get('/stats', requireManager, (authenticatedAsyncHandler(correctionController.getCorrectionStats) as any));
router.get('/:id', (authenticatedAsyncHandler(correctionController.getCorrectionById) as any));
router.put('/:id/approve', requireManager, (authenticatedAsyncHandler(correctionController.approveCorrection) as any));
router.put('/:id/reject', requireManager, (authenticatedAsyncHandler(correctionController.rejectCorrection) as any));

export default router;