import { Router, Request, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { LoginRequest, RegisterRequest, AuthenticatedRequest } from '../types';

const router = Router();

// POST /auth/login
// Proxy para autenticação no Orchestrator
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginRequest = req.body;

    // Validate request body
    if (!credentials.email || !credentials.password) {
      res.status(400).json({
        message: 'Email and password are required',
      });
      return;
    }

    // Forward to Orchestrator
    const authResponse = await orchestratorService.login(credentials);

    // Transform flat response to expected format { token, user }
    const transformedResponse = {
      token: authResponse.token,
      user: {
        id: authResponse.id,
        name: authResponse.name,
        email: authResponse.email,
        cpf: authResponse.cpf,
        walletAddress: authResponse.walletAddress,
        role: authResponse.role,
        active: authResponse.active,
        createdAt: authResponse.createdAt
      }
    };

    // Return JWT and user info in expected format
    res.json(transformedResponse);
  })
);

// POST /auth/register
// Proxy para registro de usuário no Orchestrator
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const userData: RegisterRequest = req.body;

    // Validate required fields (walletAddress is optional)
    const requiredFields = ['name', 'email', 'cpf', 'password'];
    const missingFields = requiredFields.filter((field) => !userData[field as keyof RegisterRequest]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: missingFields.map((field) => `${field} is required`),
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      res.status(400).json({
        message: 'Invalid email format',
      });
      return;
    }

    // Basic CPF validation (11 digits)
    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(userData.cpf.replace(/\D/g, ''))) {
      res.status(400).json({
        message: 'Invalid CPF format. Must be 11 digits',
      });
      return;
    }

    // Basic wallet address validation (Ethereum address format) - only if provided
    if (userData.walletAddress) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(userData.walletAddress)) {
        res.status(400).json({
          message: 'Invalid wallet address format',
        });
        return;
      }
    }

    // Forward to Orchestrator
    const registerResponse = await orchestratorService.register(userData);

    // Return success response
    res.status(201).json(registerResponse);
  })
);

// PUT /auth/wallet
// Update user's wallet address after MetaMask connection
router.put(
  '/wallet',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress } = req.body;
    const userId = req.user!.userId;

    if (!walletAddress) {
      res.status(400).json({ message: 'Wallet address is required' });
      return;
    }

    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      res.status(400).json({ message: 'Invalid wallet address format' });
      return;
    }

    // Forward to Orchestrator
    const response = await orchestratorService.updateWallet(userId, walletAddress);
    res.json(response);
  })
);

// GET /auth/me
// Retorna informações do usuário atual via JWT
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        message: 'No authorization header provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        message: 'No token provided',
      });
      return;
    }

    // In a real implementation, you would decode the JWT here
    // For now, we just validate that the token exists
    // The frontend can decode the JWT itself to get user info

    res.json({
      message: 'Use the JWT payload to get user information',
      hint: 'Decode the JWT on the frontend to extract userId, email, and role',
    });
  })
);

export default router;
