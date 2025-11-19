import { Router, Request, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const health = {
      bff: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      orchestrator: {
        status: 'unknown',
        url: process.env.ORCHESTRATOR_URL,
      },
      offchainApi: {
        status: 'unknown',
        url: process.env.OFFCHAIN_API_URL,
      },
    };

    try {
      await orchestratorService.healthCheck();
      health.orchestrator.status = 'healthy';
    } catch {
      health.orchestrator.status = 'unhealthy';
    }

    try {
      await offchainService.healthCheck();
      health.offchainApi.status = 'healthy';
    } catch {
      health.offchainApi.status = 'unhealthy';
    }

    const overallStatus =
      health.orchestrator.status === 'healthy' && health.offchainApi.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      services: health,
    });
  })
);

router.get('/ready', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
  });
});

router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
  });
});

export default router;
