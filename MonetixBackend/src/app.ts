import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoriesRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import goalRoutes from './routes/goal.routes';
import predictionRoutes from './routes/prediction.routes';
import alertRoutes from './routes/alert.routes';
import comparisonRoutes from './routes/comparison.routes';
import interRoutes from './routes/inter.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en 1 minuto.' },
});


app.get('/', (_request: Request, response: Response) => {
  response.json({
    success: true,
    message: 'API de Monetix funcionando correctamente',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      transactions: '/api/transactions',
      goals: '/api/goals',
      predictions: '/api/predictions',
      alerts: '/api/alerts',
      comparisons: '/api/comparisons',
    },
  });
});

// Rutas de administración
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoriesRoutes);

// Rutas del core
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/comparisons', comparisonRoutes);

// Comunicación inter-servicio (solo triage-service vía X-Service-Token)
app.use('/api/inter', interRoutes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

app.use((err: Error, _request: Request, response: Response, _next: NextFunction) => {
  process.stderr.write(`[ERROR] ${err.message}\n`);
  response.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

export default app;