import { Router, Request, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();

/**
 * GET /health
 *
 * Health check endpoint for the BFF and connected services
 * Returns status of BFF, Orchestrator, and Offchain API
 */
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

    // Check Orchestrator health
    try {
      await orchestratorService.healthCheck();
      health.orchestrator.status = 'healthy';
    } catch (error) {
      health.orchestrator.status = 'unhealthy';
    }

    // Check Offchain API health
    try {
      await offchainService.healthCheck();
      health.offchainApi.status = 'healthy';
    } catch (error) {
      health.offchainApi.status = 'unhealthy';
    }

    // Overall status
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

/**
 * GET /health/ready
 *
 * Readiness probe for Kubernetes/Docker
 * Returns 200 if service is ready to accept traffic
 */
router.get('/ready', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
  });
});

/**
 * GET /health/live
 *
 * Liveness probe for Kubernetes/Docker
 * Returns 200 if service is alive (even if dependencies are down)
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
  });
});

export default router;
