import { Router } from 'express';
import { authMiddleware, requireEmployee } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);
router.use(requireEmployee);

router.post('/update', (authenticatedAsyncHandler(async (_req: AuthenticatedRequest, res) => {
  res.json({ success: true, message: 'Location update endpoint - coming soon' });
}) as any));

router.get('/history', (authenticatedAsyncHandler(async (_req: AuthenticatedRequest, res) => {
  res.json({ success: true, data: [], message: 'Location history endpoint - coming soon' });
}) as any));

export default router;
