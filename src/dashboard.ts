import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { BotClient } from './types';
import { config } from './config';
import { createLogger } from './utils/logger';
import { runBotSetup } from './utils/setup';

export function startDashboard(bot: BotClient) {
    const app = express();
    const logger = createLogger();

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: false, // Allow embedding in Replit iframe
        frameguard: false             // Allow Replit iframe
    }));

    // CORS configuration
    app.use(cors({
        origin: true,   // Allow all origins for development
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
                health: '/api/health',
                setup: '/setup'
            }
        });
    });

    app.get('/api/status', (req, res) => {
        res.json({
            status: 'online',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            database: 'connected', // ✅ Replace with actual DB status
            features: config.features
        });
    });

    app.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    });

    // Setup page (basic HTML)
    app.get('/setup', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bot Setup</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; }
                    .container { text-align: center; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    input { padding: 0.5rem; margin-bottom: 1rem; width: 200px; }
                    button { padding: 0.5rem 1rem; cursor: pointer; }
                    #result { margin-top: 1rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Bot Setup</h1>
                    <input type="text" id="guildId" placeholder="Enter Guild ID">
                    <button onclick="setupBot()">Setup Bot</button>
                    <div id="result"></div>
                </div>
                <script>
                    async function setupBot() {
                        const guildId = document.getElementById('guildId').value;
                        const resultDiv = document.getElementById('result');
                        if (!guildId) {
                            resultDiv.innerHTML = '<p style="color: red;">Please enter a Guild ID.</p>';
                            return;
                        }
                        resultDiv.innerHTML = '<p>Setting up bot...</p>';
                        try {
                            const response = await fetch('/api/setup', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ guildId }),
                            });
                            const data = await response.json();
                            if (response.ok) {
                                resultDiv.innerHTML = '<p style="color: green;">' + data.message + '</p>';
                            } else {
                                resultDiv.innerHTML = '<p style="color: red;">Error: ' + data.message + '</p>';
                            }
                        } catch (error) {
                            resultDiv.innerHTML = '<p style="color: red;">An unexpected error occurred.</p>';
                        }
                    }
                </script>
            </body>
            </html>
        `);
    });

    // Setup API endpoint
    app.post('/api/setup', async (req, res) => {
        // TODO: Implement proper authentication/authorization (e.g., Discord OAuth2)
        if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { guildId } = req.body;
        if (!guildId) {
            return res.status(400).json({ message: 'Guild ID is required.' });
        }

        const guild = bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({
                message: 'Guild not found. Make sure the bot is in the server.'
            });
        }

        try {
            const result = await runBotSetup(guild, bot);
            if (result.success) {
                return res.status(200).json({ message: 'Bot setup complete!' });
            } else {
                return res.status(500).json({ message: 'Bot setup failed. Check console logs.' });
            }
        } catch (err) {
            logger.error('Setup error:', err);
            return res.status(500).json({ message: 'Unexpected error during setup.' });
        }
    });

    // 404 handler
    app.all('*', (req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: 'The requested endpoint does not exist',
            availableEndpoints: ['/', '/api/status', '/api/health', '/setup']
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

    return new Promise<void>((resolve) => {
        const server = app.listen(port, '0.0.0.0', () => {
            logger.info(`✅ Dashboard server started on http://0.0.0.0:${port}`);
            logger.info('Features enabled:', config.features);
            resolve();
        });
    });
}
