import { Router, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, PropertyFullDTO } from '../types';

const router = Router();

router.get(
  '/my',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const token = req.headers.authorization?.split(' ')[1];

    const dbProperties = await orchestratorService.getUserProperties(userId, token);

    if (dbProperties.length === 0) {
      res.json([]);
      return;
    }

    const propertiesWithBlockchainData = await Promise.all(
      dbProperties.map(async (dbProp) => {
        try {
          const blockchainData = await offchainService.getPropertyFromBlockchain(
            dbProp.matriculaId.toString()
          );

          return {
            matriculaId: dbProp.matriculaId,
            folha: dbProp.folha,
            comarca: dbProp.comarca,
            endereco: dbProp.endereco,
            metragem: dbProp.metragem,
            matriculaOrigem: dbProp.matriculaOrigem,
            ownerWalletAddress: dbProp.proprietario,
            propertyType: dbProp.tipo,
            regularStatus: dbProp.isRegular ? "REGULAR" : "IRREGULAR",
            blockchainTxHash: dbProp.blockchainTxHash,
            createdAt: dbProp.createdAt,
            updatedAt: dbProp.updatedAt,
            blockchain: blockchainData,
          };
        } catch (error) {
          return {
            matriculaId: dbProp.matriculaId,
            folha: dbProp.folha,
            comarca: dbProp.comarca,
            endereco: dbProp.endereco,
            metragem: dbProp.metragem,
            matriculaOrigem: dbProp.matriculaOrigem,
            ownerWalletAddress: dbProp.proprietario,
            propertyType: dbProp.tipo,
            regularStatus: dbProp.isRegular ? "REGULAR" : "IRREGULAR",
            blockchainTxHash: dbProp.blockchainTxHash,
            createdAt: dbProp.createdAt,
            updatedAt: dbProp.updatedAt,
            blockchain: null,
          };
        }
      })
    );

    res.json(propertiesWithBlockchainData);
  })
);

router.get(
  '/:matriculaId/full',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId } = req.params;

    const dbData = await orchestratorService.getPropertyMetadata(matriculaId);
    const blockchainData = await offchainService.getPropertyFromBlockchain(matriculaId);

    const fullProperty: PropertyFullDTO = {
      dbData: {
        matriculaId: dbData.matriculaId,
        folha: dbData.folha,
        comarca: dbData.comarca,
        endereco: dbData.endereco,
        metragem: dbData.metragem,
        proprietario: dbData.proprietario,
        tipo: dbData.tipo,
        isRegular: dbData.isRegular,
        matriculaOrigem: dbData.matriculaOrigem,
        registrationDate: dbData.createdAt || new Date().toISOString(),
      },
      blockchainData: {
        ownerWallet: blockchainData.ownerWallet || dbData.proprietario,
        tokenId: blockchainData.tokenId || matriculaId,
        txHash: blockchainData.txHash,
        status: blockchainData.status || 'pending',
        isFrozen: blockchainData.isFrozen || false,
      },
    };

    res.json(fullProperty);
  })
);

router.post(
  '/register',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const propertyData = req.body;
    const authHeader = req.headers.authorization!;

    const requiredFields = ['matriculaId', 'folha', 'comarca', 'endereco', 'metragem', 'proprietario', 'tipo'];
    const missingFields = requiredFields.filter((field) => !propertyData[field]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: missingFields.map((field) => `${field} is required`),
      });
      return;
    }

    const registerResponse = await orchestratorService.registerProperty(
      propertyData,
      authHeader.split(' ')[1]
    );

    res.status(201).json(registerResponse);
  })
);

router.get(
  '/owner/:walletAddress',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress } = req.params;

    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      res.status(400).json({
        message: 'Invalid wallet address format',
      });
      return;
    }

    const properties = await offchainService.getPropertiesByOwner(walletAddress);

    res.json(properties);
  })
);

router.get(
  '/search',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { query, type } = req.query;

    res.json({
      message: 'Search functionality not yet implemented',
      params: { query, type },
      results: [],
    });
  })
);

export default router;
