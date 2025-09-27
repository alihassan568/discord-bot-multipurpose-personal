# 🤖 Multipurpose Discord Bot

A comprehensive, production-ready Discord bot featuring moderation, anti-nuke protection, ticketing, music, and much more. Built with TypeScript, Discord.js v14, and modern development practices.

## ✨ Features

### 🛡️ **Moderation & Security**
- **Advanced Moderation**: Ban, kick, mute, timeout, warn, and bulk message management
- **Anti-Nuke Protection**: Automatic detection and mitigation of mass actions
- **Audit Logging**: Comprehensive logging with case IDs and evidence support
- **Role Hierarchy**: Proper permission checks and role management
- **Scheduled Actions**: Temporary bans/mutes with automatic expiration

### 🎫 **Ticket System**
- **Professional Tickets**: Create, manage, and close support tickets
- **Staff Routing**: Automatic staff assignment and notifications
- **Transcripts**: Generate PDF/HTML transcripts of ticket conversations
- **Categories**: Organized ticket categories for different support types
- **Permission Management**: Proper access controls for staff and users

### 🎵 **Music Player**
- **Multi-Source Support**: YouTube, Spotify, SoundCloud integration
- **Queue Management**: Add, remove, shuffle, and loop tracks
- **High-Quality Audio**: Lavalink integration for scalable audio streaming
- **Voice Controls**: Volume, pause, resume, skip, and seek functionality
- **Playlists**: Save and load custom playlists

### 🎉 **Fun & Engagement**
- **User Profiles**: XP/Level system, badges, and statistics tracking
- **Birthday System**: Automatic birthday celebrations and reminders
- **Fun Commands**: 8ball, dice, trivia, memes, and interactive games
- **Image Generation**: Avatar manipulation and meme creation

### ⚙️ **Dashboard & Management**
- **Web Dashboard**: React-based admin panel with Discord OAuth2
- **Real-time Configuration**: Live settings updates without restarts
- **Analytics**: Detailed usage statistics and performance metrics
- **Module Management**: Enable/disable features per server

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- Discord Bot Application

### 1. Clone & Setup
```bash
git clone <repository-url>
cd multipurpose-discord-bot
```

### 2. Easy Setup (Recommended)
```bash
# Run the setup script for development
./scripts/setup.sh dev

# Or for production
./scripts/setup.sh prod
```

### 3. Manual Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Discord bot token and database URLs
nano .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Build and start
npm run build
npm start
```

### 4. Docker Setup (Production)
```bash
# Copy environment file and configure
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f bot
```

## 📋 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ | - |
| `DISCORD_CLIENT_ID` | Discord application client ID | ✅ | - |
| `DISCORD_CLIENT_SECRET` | Discord application client secret | ✅ | - |
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `REDIS_URL` | Redis connection string | ✅ | - |
| `SESSION_SECRET` | Session encryption key | ✅ | - |
| `JWT_SECRET` | JWT signing key | ✅ | - |
| `DEFAULT_PREFIX` | Default command prefix | ❌ | `!` |
| `OWNER_IDS` | Comma-separated owner user IDs | ❌ | - |

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to "Bot" section
4. Create a bot and copy the token
5. Enable required intents:
   - Server Members Intent
   - Message Content Intent
6. Generate invite link with required permissions:
   - Administrator (or specific permissions)
   - Use Slash Commands

### Required Permissions
```
Manage Channels, Manage Roles, Ban Members, Kick Members, 
Manage Messages, Embed Links, Attach Files, Read Message History, 
Connect, Speak, Use Voice Activity, Move Members
```

## 🛠️ Development

### Development Mode
```bash
# Start development environment with hot reload
npm run dev

# Start development database
docker-compose -f docker-compose.dev.yml up -d

# View database with Prisma Studio
npx prisma studio

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Project Structure
```
src/
├── commands/           # Slash commands organized by category
│   ├── moderation/    # Ban, kick, mute, etc.
│   ├── music/         # Play, queue, skip, etc.
│   ├── tickets/       # Ticket management
│   ├── fun/           # Entertainment commands
│   └── general/       # Help, ping, info
├── events/            # Discord.js event handlers
├── services/          # Business logic and external APIs
├── middleware/        # Security and rate limiting
├── utils/             # Helper functions and utilities
├── types/             # TypeScript type definitions
└── config/           # Configuration management
```

### Adding Commands

1. Create command file in appropriate category folder:
```typescript
// src/commands/category/example.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example command'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hello World!');
  },
};

export default command;
```

2. The command will be automatically loaded on restart

## 🔧 Deployment

### Docker Compose (Recommended)
```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Update bot
docker-compose pull bot
docker-compose up -d bot
```

### Manual Deployment
```bash
# Build the project
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name discord-bot

# Or with systemd
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
```

### Health Checks
The bot includes health check endpoints:
- `GET /health` - Basic health status
- `GET /metrics` - Performance metrics (if enabled)

## 📊 Monitoring

### Logging
- Structured JSON logs with Winston
- Daily log rotation
- Error tracking with Sentry (optional)
- Separate error and access logs

### Metrics
- Command usage statistics
- Response time monitoring
- Error rate tracking
- Resource usage metrics

## 🔐 Security Features

- **Rate Limiting**: Per-user and per-guild command limits
- **Permission Validation**: Multiple layers of permission checking
- **Input Sanitization**: All user inputs are validated and sanitized
- **Audit Trails**: Complete audit logs for moderation actions
- **Secure Sessions**: Encrypted sessions with Redis storage
- **Environment Isolation**: Secrets managed through environment variables

## 🎯 Anti-Nuke Protection

The bot includes sophisticated anti-nuke protection:

### Detection
- Mass member bans/kicks
- Rapid role deletions
- Channel deletion sprees
- Permission escalation attempts
- Unauthorized bot additions

### Mitigation
- Automatic action reversal
- Offender permission removal
- Server lockdown capabilities
- Owner/staff notifications
- Evidence collection

### Configuration
```bash
# Configure via dashboard or commands
/setup antinuke
/antinuke whitelist @trusted_user
/antinuke threshold bans 5
```

## 📚 Commands Reference

### Moderation
- `/ban <user> [reason] [duration]` - Ban a user
- `/kick <user> [reason]` - Kick a user  
- `/mute <user> [duration] [reason]` - Mute a user
- `/warn <user> <reason>` - Warn a user
- `/clear <amount> [user]` - Clear messages
- `/modlogs <user>` - View moderation history

### Music  
- `/play <song>` - Play or queue a song
- `/pause` - Pause playback
- `/skip [amount]` - Skip songs
- `/queue` - View queue
- `/volume <1-100>` - Set volume
- `/loop <mode>` - Set loop mode

### Tickets
- `/ticket create <reason>` - Create a ticket
- `/ticket close [reason]` - Close a ticket
- `/ticket add <user>` - Add user to ticket
- `/ticket transcript` - Generate transcript

### Fun
- `/8ball <question>` - Magic 8-ball
- `/meme` - Random meme
- `/profile [user]` - User profile
- `/trivia` - Start trivia game

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Use conventional commits
- Ensure code passes linting

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Discord Server**: [Join our support server](https://discord.gg/your-invite)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@your-domain.com

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [Prisma](https://prisma.io/) - Database toolkit
- [Lavalink](https://github.com/freyacodes/Lavalink) - Audio streaming
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

**⭐ If you found this project helpful, please give it a star!**

Made with ❤️ for the Discord community