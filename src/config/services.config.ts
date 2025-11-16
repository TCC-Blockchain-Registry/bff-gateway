import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  services: {
    orchestrator: {
      url: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
      timeout: 30000, // 30 seconds
    },
    offchainApi: {
      url: process.env.OFFCHAIN_API_URL || 'http://localhost:3000',
      timeout: 60000, // 60 seconds (blockchain operations can be slow)
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '24h',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
