import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/services.config';
import { errorHandler } from './middlewares/error.middleware';

// Import routes (will be created in next tasks)
import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import transferRoutes from './routes/transfer.routes';
import healthRoutes from './routes/health.routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.use('/auth', authRoutes);
app.use('/properties', propertyRoutes);
app.use('/transfers', transferRoutes);
app.use('/health', healthRoutes);

// Welcome route
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

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
