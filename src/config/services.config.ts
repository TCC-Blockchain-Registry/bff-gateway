import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  services: {
    orchestrator: {
      url: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
      timeout: 30000,
    },
    offchainApi: {
      url: process.env.OFFCHAIN_API_URL || 'http://localhost:3000',
      timeout: 60000,
    },
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  },
};
