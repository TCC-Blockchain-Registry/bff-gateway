import axios, { AxiosInstance } from 'axios';
import { config } from '../config/services.config';
import { AppError } from '../middlewares/error.middleware';

class OffchainService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.services.offchainApi.url,
      timeout: config.services.offchainApi.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new AppError(
            error.response.data.message || 'Blockchain service error',
            error.response.status
          );
        } else if (error.request) {
          throw new AppError('Blockchain service is unavailable', 503);
        } else {
          throw new AppError('Failed to call blockchain service', 500);
        }
      }
    );
  }

  async getPropertiesByOwner(walletAddress: string): Promise<any[]> {
    const response = await this.client.get(`/api/properties/owner/${walletAddress}`);
    return response.data;
  }

  async getPropertyFromBlockchain(matriculaId: string): Promise<any> {
    const response = await this.client.get(`/api/properties/${matriculaId}`);
    return response.data;
  }

  async getTransferFromBlockchain(transferId: string): Promise<any> {
    const response = await this.client.get(`/api/transfers/${transferId}`);
    return response.data;
  }

  async getApprovers(): Promise<any[]> {
    const response = await this.client.get('/api/approvers');
    return response.data;
  }

  async configureTransfer(transferData: any): Promise<any> {
    const response = await this.client.post('/api/transfers/configure', transferData);
    return response.data;
  }

  async approveTransfer(approvalData: any): Promise<any> {
    const response = await this.client.post('/api/transfers/approve', approvalData);
    return response.data;
  }

  async acceptTransfer(acceptData: any): Promise<any> {
    const response = await this.client.post('/api/transfers/accept', acceptData);
    return response.data;
  }

  async executeTransfer(executeData: any): Promise<any> {
    const response = await this.client.post('/api/transfers/execute', executeData);
    return response.data;
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Registra identidade de um wallet no Identity Registry
   * Se já estiver registrado, retorna success sem erro
   */
  async registerIdentity(walletAddress: string): Promise<{ success: boolean; alreadyRegistered?: boolean }> {
    try {
      const response = await this.client.post('/api/identity/register', {
        walletAddress,
        countryCode: 76 // Brasil
      });
      return response.data;
    } catch (error: any) {
      // Se o erro é porque já está registrado, não é um erro fatal
      if (error.response?.data?.message?.includes('já')) {
        return { success: true, alreadyRegistered: true };
      }
      throw error;
    }
  }

  /**
   * Verifica se um wallet tem identidade registrada
   */
  async verifyIdentity(walletAddress: string): Promise<{ isVerified: boolean; identityContract: string }> {
    const response = await this.client.get(`/api/identity/${walletAddress}/verify`);
    return response.data.data;
  }
}

export const offchainService = new OffchainService();
