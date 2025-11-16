import { Router, Request, Response } from 'express';
import { orchestratorService } from '../services/orchestrator.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { LoginRequest, RegisterRequest, AuthenticatedRequest } from '../types';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginRequest = req.body;

    if (!credentials.email || !credentials.password) {
      res.status(400).json({
        message: 'Email and password are required',
      });
      return;
    }

    const authResponse = await orchestratorService.login(credentials);

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

    res.json(transformedResponse);
  })
);

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const userData: RegisterRequest = req.body;

    const requiredFields = ['name', 'email', 'cpf', 'password'];
    const missingFields = requiredFields.filter((field) => !userData[field as keyof RegisterRequest]);

    if (missingFields.length > 0) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: missingFields.map((field) => `${field} is required`),
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      res.status(400).json({
        message: 'Invalid email format',
      });
      return;
    }

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(userData.cpf.replace(/\D/g, ''))) {
      res.status(400).json({
        message: 'Invalid CPF format. Must be 11 digits',
      });
      return;
    }

    if (userData.walletAddress) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(userData.walletAddress)) {
        res.status(400).json({
          message: 'Invalid wallet address format',
        });
        return;
      }
    }

    const registerResponse = await orchestratorService.register(userData);

    res.status(201).json(registerResponse);
  })
);

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

    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      res.status(400).json({ message: 'Invalid wallet address format' });
      return;
    }

    const response = await orchestratorService.updateWallet(userId, walletAddress);
    res.json(response);
  })
);

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

    res.json({
      message: 'Use the JWT payload to get user information',
      hint: 'Decode the JWT on the frontend to extract userId, email, and role',
    });
  })
);

export default router;
