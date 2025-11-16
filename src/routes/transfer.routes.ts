import { Router, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, TransferStatusDTO } from '../types';

const router = Router();

/**
 * POST /transfers/configure
 *
 * Configure a new property transfer with required approvers
 * Proxies to Offchain API to interact with blockchain
 *
 * Requires JWT authentication
 */
router.post(
  '/configure',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transferData = req.body;

    // Forward to Offchain API
    const result = await offchainService.configureTransfer(transferData);

    res.json(result);
  })
);

/**
 * POST /transfers/approve
 *
 * Approve a transfer as an authorized approver
 * Proxies to Offchain API
 *
 * Requires JWT authentication
 */
router.post(
  '/approve',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const approvalData = req.body;

    // Forward to Offchain API
    const result = await offchainService.approveTransfer(approvalData);

    res.json(result);
  })
);

/**
 * POST /transfers/accept
 *
 * Accept a transfer as the buyer
 * Proxies to Offchain API
 *
 * Requires JWT authentication
 */
router.post(
  '/accept',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const acceptData = req.body;

    // Forward to Offchain API
    const result = await offchainService.acceptTransfer(acceptData);

    res.json(result);
  })
);

/**
 * POST /transfers/execute
 *
 * Execute a transfer (complete the ownership change)
 * Proxies to Offchain API
 *
 * Requires JWT authentication
 */
router.post(
  '/execute',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const executeData = req.body;

    // Forward to Offchain API
    const result = await offchainService.executeTransfer(executeData);

    res.json(result);
  })
);

/**
 * GET /transfers/:transferId/status
 *
 * Get complete transfer status
 * AGGREGATES: Orchestrator (DB status) + Offchain API (blockchain approvals)
 *
 * This is a key example of BFF aggregation - combining data from multiple sources
 */
router.get(
  '/:transferId/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { transferId } = req.params;

    try {
      // 1. Get transfer data from Orchestrator (DB)
      const dbTransfer = await orchestratorService.getTransferStatus(transferId);

      // 2. Get blockchain data (approvals, buyer acceptance)
      let blockchainTransfer;
      try {
        blockchainTransfer = await offchainService.getTransferFromBlockchain(transferId);
      } catch (error) {
        // If blockchain data not available, use DB data only
        blockchainTransfer = null;
      }

      // 3. Aggregate data
      const transferStatus: TransferStatusDTO = {
        transferId: dbTransfer.transferId || transferId,
        matriculaId: dbTransfer.matriculaId,
        seller: dbTransfer.seller,
        buyer: dbTransfer.buyer,
        status: blockchainTransfer?.status || dbTransfer.status,
        approvals: blockchainTransfer?.approvals || dbTransfer.approvals || [],
        buyerAccepted: blockchainTransfer?.buyerAccepted || false,
        createdAt: dbTransfer.createdAt,
      };

      res.json(transferStatus);
    } catch (error) {
      // If transfer not found in DB, try blockchain only
      const blockchainTransfer = await offchainService.getTransferFromBlockchain(transferId);
      res.json(blockchainTransfer);
    }
  })
);

/**
 * GET /transfers/my
 *
 * Get all transfers involving the authenticated user
 * (either as seller or buyer)
 *
 * Requires JWT authentication
 */
router.get(
  '/my',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    // This would aggregate transfers from Orchestrator DB
    // For now, return placeholder
    res.json({
      message: 'Get user transfers - not yet implemented',
      userId,
      transfers: [],
    });
  })
);

/**
 * GET /transfers/property/:matriculaId
 *
 * Get transfer history for a specific property
 */
router.get(
  '/property/:matriculaId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId } = req.params;

    // This would query transfer history from blockchain events
    res.json({
      message: 'Get property transfer history - not yet implemented',
      matriculaId,
      history: [],
    });
  })
);

/**
 * GET /transfers/pending
 *
 * Get all pending transfers that require action from the authenticated user
 *
 * Requires JWT authentication
 */
router.get(
  '/pending',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    // This would filter transfers where:
    // - User is an approver and hasn't approved yet
    // - User is buyer and hasn't accepted yet
    // - User is seller and can execute

    res.json({
      message: 'Get pending transfers - not yet implemented',
      userId,
      pending: [],
    });
  })
);

export default router;
