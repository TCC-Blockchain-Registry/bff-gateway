import axios, { AxiosInstance } from 'axios';
import { config } from '../config/services.config';
import { AppError } from '../middlewares/error.middleware';
import { LoginRequest, RegisterRequest, OrchestratorLoginResponse, PropertyDTO } from '../types';

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

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new AppError(
            error.response.data.message || 'Orchestrator service error',
            error.response.status,
            error.response.data.errors
          );
        } else if (error.request) {
          throw new AppError('Orchestrator service is unavailable', 503);
        } else {
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

  async getUserProperties(token: string): Promise<PropertyDTO[]> {
    const response = await this.client.get<PropertyDTO[]>('/api/properties/my', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async getPropertyMetadata(matriculaId: string, token?: string): Promise<PropertyDTO> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await this.client.get<PropertyDTO>(`/api/properties/by-matricula/${matriculaId}`, { headers });
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

  async updateWallet(userId: string, walletAddress: string, token?: string): Promise<any> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await this.client.put(`/api/users/${userId}/wallet`, { walletAddress }, { headers });
    return response.data;
  }

  async getAllTransfers(): Promise<any[]> {
    const response = await this.client.get('/api/property-transfers');
    return response.data;
  }

  async getTransfersByProperty(propertyId: string): Promise<any[]> {
    const response = await this.client.get(`/api/property-transfers/by-property/${propertyId}`);
    return response.data;
  }
}

export const orchestratorService = new OrchestratorService();
