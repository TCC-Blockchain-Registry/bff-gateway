import { Router, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, TransferStatusDTO } from '../types';

const router = Router();

/**
 * Initiate a property transfer
 *
 * ARCHITECTURAL PATTERN: BFF → Orchestrator → Queue → Worker → Offchain Consumer
 *
 * This endpoint:
 * 1. Validates request
 * 2. Forwards to Orchestrator's /api/transfers/initiate endpoint
 * 3. Orchestrator handles all business logic (owner validation, buyer lookup, queue publishing)
 *
 * @deprecated The old /configure endpoint has been removed - it violated architecture by calling
 *             Offchain Consumer directly. Use this /initiate endpoint instead.
 */
router.post(
  '/initiate',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId, buyerCpf, buyerWalletAddress } = req.body;
    const token = req.headers.authorization!.split(' ')[1];

    // Basic validation
    if (!matriculaId) {
      throw new AppError('matriculaId é obrigatório', 400);
    }

    if (!buyerCpf && !buyerWalletAddress) {
      throw new AppError('buyerCpf ou buyerWalletAddress é obrigatório', 400);
    }

    if (buyerCpf && buyerWalletAddress) {
      throw new AppError('Forneça apenas buyerCpf ou buyerWalletAddress, não ambos', 400);
    }

    // Proxy to Orchestrator - all business logic happens there
    const result = await orchestratorService.initiateTransfer(token, {
      matriculaId: Number(matriculaId),
      buyerCpf: buyerCpf || undefined,
      buyerWalletAddress: buyerWalletAddress || undefined
    });

    res.status(201).json(result);
  })
);

router.post(
  '/approve',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const approvalData = req.body;
    const result = await offchainService.approveTransfer(approvalData);
    res.json(result);
  })
);

router.post(
  '/accept',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const acceptData = req.body;
    const result = await offchainService.acceptTransfer(acceptData);
    res.json(result);
  })
);

router.post(
  '/execute',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const executeData = req.body;
    const result = await offchainService.executeTransfer(executeData);
    res.json(result);
  })
);

router.get(
  '/:transferId/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { transferId } = req.params;

    try {
      const dbTransfer = await orchestratorService.getTransferStatus(transferId);

      let blockchainTransfer;
      try {
        blockchainTransfer = await offchainService.getTransferFromBlockchain(transferId);
      } catch (error) {
        blockchainTransfer = null;
      }

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
      const blockchainTransfer = await offchainService.getTransferFromBlockchain(transferId);
      res.json(blockchainTransfer);
    }
  })
);

router.get(
  '/my',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      // Get user's properties
      const userProperties = await orchestratorService.getUserProperties(userId.toString());
      
      // Get all transfers
      const allTransfers = await orchestratorService.getAllTransfers();
      
      // Filter transfers for user's properties (using matriculaId)
      const userMatriculaIds = userProperties.map(p => p.matriculaId.toString());
      const userTransfers = allTransfers.filter(transfer => 
        userMatriculaIds.includes(transfer.matriculaId?.toString())
      );

      res.json(userTransfers);
    } catch (error) {
      // If orchestrator doesn't have user properties endpoint yet, return empty array
      res.json([]);
    }
  })
);

router.get(
  '/property/:matriculaId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId } = req.params;

    res.json({
      message: 'Get property transfer history - not yet implemented',
      matriculaId,
      history: [],
    });
  })
);

router.get(
  '/pending',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    res.json({
      message: 'Get pending transfers - not yet implemented',
      userId,
      pending: [],
    });
  })
);

export default router;
