import { Router, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, PropertyFullDTO } from '../types';

const router = Router();

// GET /properties/my
// Buscar propriedades do usuário autenticado
// Combina dados do Orchestrator + Offchain API
router.get(
  '/my',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    // 1. Get properties from Orchestrator (PostgreSQL metadata)
    const dbProperties = await orchestratorService.getUserProperties(userId);

    if (dbProperties.length === 0) {
      res.json([]);
      return;
    }

    // 2. Get blockchain data for each property
    const propertiesWithBlockchainData = await Promise.all(
      dbProperties.map(async (dbProp) => {
        try {
          const blockchainData = await offchainService.getPropertyFromBlockchain(
            dbProp.matriculaId.toString()
          );

          // Transform backend fields to frontend expected fields
          return {
            matriculaId: dbProp.matriculaId,
            folha: dbProp.folha,
            comarca: dbProp.comarca,
            endereco: dbProp.endereco,
            metragem: dbProp.metragem,
            matriculaOrigem: dbProp.matriculaOrigem,
            // Field name transformations for frontend compatibility
            ownerWalletAddress: dbProp.proprietario,
            propertyType: dbProp.tipo,
            regularStatus: dbProp.isRegular ? "REGULAR" : "IRREGULAR",
            // Metadata
            blockchainTxHash: dbProp.blockchainTxHash,
            createdAt: dbProp.createdAt,
            updatedAt: dbProp.updatedAt,
            // Blockchain data
            blockchain: blockchainData,
          };
        } catch (error) {
          // If blockchain data not found, return DB data only
          return {
            matriculaId: dbProp.matriculaId,
            folha: dbProp.folha,
            comarca: dbProp.comarca,
            endereco: dbProp.endereco,
            metragem: dbProp.metragem,
            matriculaOrigem: dbProp.matriculaOrigem,
            // Field name transformations for frontend compatibility
            ownerWalletAddress: dbProp.proprietario,
            propertyType: dbProp.tipo,
            regularStatus: dbProp.isRegular ? "REGULAR" : "IRREGULAR",
            // Metadata
            blockchainTxHash: dbProp.blockchainTxHash,
            createdAt: dbProp.createdAt,
            updatedAt: dbProp.updatedAt,
            // Blockchain data
            blockchain: null,
          };
        }
      })
    );

    res.json(propertiesWithBlockchainData);
  })
);

// GET /properties/:matriculaId/full
// Detalhes completos da propriedade (DB + blockchain)
router.get(
  '/:matriculaId/full',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId } = req.params;

    // 1. Get property metadata from Orchestrator
    const dbData = await orchestratorService.getPropertyMetadata(matriculaId);

    // 2. Get blockchain data from Offchain API
    const blockchainData = await offchainService.getPropertyFromBlockchain(matriculaId);

    // 3. Aggregate both sources
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

// POST /properties/register
// Registrar nova propriedade (envia para Orchestrator)
router.post(
  '/register',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const propertyData = req.body;
    const authHeader = req.headers.authorization!;

    // Validate required fields
    const requiredFields = ['matriculaId', 'folha', 'comarca', 'endereco', 'metragem', 'proprietario', 'tipo'];
    const missingFields = requiredFields.filter((field) => !propertyData[field]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: missingFields.map((field) => `${field} is required`),
      });
      return;
    }

    // Forward to Orchestrator
    const registerResponse = await orchestratorService.registerProperty(
      propertyData,
      authHeader.split(' ')[1]
    );

    res.status(201).json(registerResponse);
  })
);

// GET /properties/owner/:walletAddress
// Buscar propriedades por endereço de carteira
router.get(
  '/owner/:walletAddress',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress } = req.params;

    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      res.status(400).json({
        message: 'Invalid wallet address format',
      });
      return;
    }

    // Get properties from blockchain
    const properties = await offchainService.getPropertiesByOwner(walletAddress);

    res.json(properties);
  })
);

// GET /properties/search
// Buscar propriedades por critérios
router.get(
  '/search',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { query, type } = req.query;

    // For now, return empty array
    // In a real implementation, this would search across both DB and blockchain
    res.json({
      message: 'Search functionality not yet implemented',
      params: { query, type },
      results: [],
    });
  })
);

export default router;
