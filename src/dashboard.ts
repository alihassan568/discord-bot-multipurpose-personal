import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { createLogger } from './utils/logger';

const app = express();
const logger = createLogger();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow embedding in Replit iframe
    frameguard: false // Allow Replit iframe
}));

// CORS configuration for Replit proxy
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic dashboard routes
app.get('/', (req, res) => {
    res.json({
        name: 'Discord Bot Dashboard',
        status: 'online',
        version: '1.0.0',
        features: {
            antinuke: config.features.antiNuke,
            moderation: config.features.moderation,
            tickets: config.features.tickets,
            dashboard: config.features.dashboard
        },
        endpoints: {
            status: '/api/status',
            health: '/api/health'
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        database: 'connected',
        features: config.features
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: ['/', '/api/status', '/api/health']
    });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Dashboard error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    });
});

const port = config.dashboard.port;

export function startDashboard() {
    return new Promise<void>((resolve) => {
        const server = app.listen(port, '0.0.0.0', () => {
            logger.info(`Dashboard server started on http://0.0.0.0:${port}`);
            logger.info('Dashboard features enabled:', config.features);
            resolve();
        });
    });
}

export default app;