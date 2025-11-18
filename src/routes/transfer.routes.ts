import { Router, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { offchainService } from '../services/offchain.service';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, TransferStatusDTO } from '../types';

const router = Router();

router.post(
  '/configure',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matriculaId, toWalletAddress, toCpf } = req.body;
    const token = req.headers.authorization!.split(' ')[1];

    if (!matriculaId) {
      throw new AppError('matriculaId é obrigatório', 400);
    }

    if (!toWalletAddress && !toCpf) {
      throw new AppError('toWalletAddress ou toCpf é obrigatório', 400);
    }

    // 1. Buscar propriedade pelo matriculaId
    // Buscar todas as propriedades e filtrar pela matrícula (já que não existe endpoint específico)
    const allProperties = await orchestratorService.getAllProperties(token);
    const property = allProperties.find((p: any) => p.matriculaId === Number(matriculaId));
    
    if (!property) {
      throw new AppError('Propriedade não encontrada', 404);
    }

    // 2. Buscar dados do usuário logado
    const user = await orchestratorService.getUserProfile(token);
    
    // 3. Verificar se o usuário é dono da propriedade (comparando wallets)
    if (!user.walletAddress) {
      throw new AppError('Você precisa conectar sua carteira antes de transferir propriedades', 400);
    }

    const userWallet = user.walletAddress.toLowerCase();
    const propertyOwnerWallet = property.proprietario?.toLowerCase();

    if (!propertyOwnerWallet || userWallet !== propertyOwnerWallet) {
      throw new AppError('Você não é o proprietário desta propriedade', 403);
    }

    const from = property.proprietario;
    let to = toWalletAddress;

    // 4. Se for CPF, buscar wallet pelo CPF (TODO: implementar)
    if (toCpf && !toWalletAddress) {
      throw new AppError('Transferência por CPF ainda não implementada. Use wallet address.', 400);
    }

    // 5. ✅ CORREÇÃO: Garantir que identidade do destinatário está registrada
    try {
      console.log(`🔍 Verificando identidade do destinatário: ${to}`);
      const isVerified = await offchainService.isIdentityVerified(to);
      
      if (!isVerified) {
        console.log(`📝 Destinatário não verificado. Registrando identidade automaticamente...`);
        await offchainService.registerIdentity(to);
        console.log(`✅ Identidade do destinatário registrada com sucesso!`);
      } else {
        console.log(`✅ Destinatário já possui identidade verificada`);
      }
    } catch (error) {
      console.error(`⚠️  Erro ao verificar/registrar identidade do destinatário:`, error);
      throw new AppError('Falha ao validar destinatário. Tente novamente.', 500);
    }

    // 4. Buscar aprovadores recomendados
    let activeApprovers: string[] = [];
    try {
      const approvers = await offchainService.getApprovers();
      activeApprovers = approvers
        .filter((a: any) => a.active)
        .map((a: any) => a.wallet);
    } catch (error) {
      // Se falhar ao buscar aprovadores, usa o wallet do admin como fallback
      console.warn('Falha ao buscar aprovadores, usando admin wallet como fallback');
      activeApprovers = ['0x627306090abaB3A6e1400e9345bC60c78a8BEf57'];
    }

    if (activeApprovers.length === 0) {
      // Usa wallet do admin como fallback se não houver aprovadores
      activeApprovers = ['0x627306090abaB3A6e1400e9345bC60c78a8BEf57'];
    }

    // 5. Configurar transferência com dados completos
    const result = await offchainService.configureTransfer({
      from,
      to,
      matriculaId: Number(matriculaId),
      approvers: activeApprovers
    });

    res.json(result);
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
