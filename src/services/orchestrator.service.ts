import axios, { AxiosInstance } from 'axios';
import { config } from '../config/services.config';
import { AppError } from '../middlewares/error.middleware';
import { LoginRequest, RegisterRequest, OrchestratorLoginResponse, PropertyDTO } from '../types';

// HTTP client for Core Orchestrator service
class OrchestratorService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.services.orchestrator.url,
      timeout: config.services.orchestrator.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error
          throw new AppError(
            error.response.data.message || 'Orchestrator service error',
            error.response.status,
            error.response.data.errors
          );
        } else if (error.request) {
          // No response received
          throw new AppError('Orchestrator service is unavailable', 503);
        } else {
          // Request setup error
          throw new AppError('Failed to call Orchestrator service', 500);
        }
      }
    );
  }

  async login(credentials: LoginRequest): Promise<OrchestratorLoginResponse> {
    const response = await this.client.post<OrchestratorLoginResponse>('/api/users/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<{ message: string; userId: string }> {
    const response = await this.client.post('/api/users/register', userData);
    return response.data;
  }

  async getUserProperties(userId: string): Promise<PropertyDTO[]> {
    const response = await this.client.get<PropertyDTO[]>(`/api/properties/user/${userId}`);
    return response.data;
  }

  async getPropertyMetadata(matriculaId: string): Promise<PropertyDTO> {
    const response = await this.client.get<PropertyDTO>(`/api/properties/by-matricula/${matriculaId}`);
    return response.data;
  }

  async registerProperty(propertyData: PropertyDTO, token: string): Promise<any> {
    const response = await this.client.post('/api/properties/register', propertyData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async getTransferStatus(transferId: string): Promise<any> {
    const response = await this.client.get(`/api/property-transfers/${transferId}/status`);
    return response.data;
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async updateWallet(userId: string, walletAddress: string): Promise<any> {
    const response = await this.client.put(`/api/users/${userId}/wallet`, { walletAddress });
    return response.data;
  }
}

export const orchestratorService = new OrchestratorService();
