import { Request } from 'express';

// Extend Express Request to include user from JWT
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  cpf: string;
  password: string;
  walletAddress: string;
}

// Orchestrator raw login response (flat structure)
export interface OrchestratorLoginResponse {
  token: string;
  id: number;
  name: string;
  email: string;
  cpf: string | null;
  walletAddress: string | null;
  role: string;
  active: boolean;
  createdAt: string;
  message: string;
}

// BFF formatted auth response (nested structure expected by frontend)
export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    cpf: string | null;
    walletAddress: string | null;
    role: string;
    active: boolean;
    createdAt: string;
  };
}

// Property Types
export interface PropertyDTO {
  matriculaId: number;
  folha: number;
  comarca: string;
  endereco: string;
  metragem: number;
  proprietario: string; // wallet address
  matriculaOrigem?: number;
  tipo: 'URBANO' | 'RURAL' | 'LITORAL';
  isRegular?: boolean;
  blockchainTxHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyFullDTO {
  // Database data (from Orchestrator)
  dbData: {
    matriculaId: number;
    folha: number;
    comarca: string;
    endereco: string;
    metragem: number;
    proprietario: string;
    tipo: 'URBANO' | 'RURAL' | 'LITORAL';
    isRegular?: boolean;
    matriculaOrigem?: number;
    registrationDate: string;
  };
  // Blockchain data (from Offchain API)
  blockchainData: {
    ownerWallet: string;
    tokenId: string;
    txHash?: string;
    status: string;
    isFrozen: boolean;
  };
}

// Transfer Types
export interface TransferStatusDTO {
  transferId: string;
  matriculaId: string;
  seller: string;
  buyer: string;
  status: string;
  approvals: {
    entity: string;
    approved: boolean;
    timestamp?: string;
  }[];
  buyerAccepted: boolean;
  createdAt: string;
}

// Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: any[];
}
