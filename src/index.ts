import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/services.config';
import { errorHandler } from './middlewares/error.middleware';

import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import transferRoutes from './routes/transfer.routes';
import healthRoutes from './routes/health.routes';

const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/auth', authRoutes);
app.use('/properties', propertyRoutes);
app.use('/transfers', transferRoutes);
app.use('/health', healthRoutes);

app.get('/', (_req, res) => {
  res.json({
    service: 'BFF Gateway - Property Tokenization Platform',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/auth',
      properties: '/properties',
      transfers: '/transfers',
      health: '/health',
    },
  });
});

app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 BFF Gateway started successfully`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Orchestrator: ${config.services.orchestrator.url}`);
  console.log(`⛓️  Offchain API: ${config.services.offchainApi.url}`);
  console.log('='.repeat(50));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
