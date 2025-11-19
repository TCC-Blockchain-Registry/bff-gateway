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

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (_req, res) => {
  res.json({
    service: 'BFF Gateway - Property Tokenization Platform',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      transfers: '/api/transfers',
      health: '/api/health',
    },
  });
});

app.use(errorHandler);

const PORT = config.port;

app.listen(PORT);

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

export default app;
