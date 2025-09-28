# 🚀 Quick Start Guide

This guide will help you get the Discord bot up and running in development mode.

## Prerequisites

Make sure you have these installed:
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 13+** ([Download](https://www.postgresql.org/download/))
- **Redis 6+** ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com/downloads))

## 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd multipurpose-discord-bot

# Install dependencies
npm install
```

## 2. Database Setup

### Option A: Using Docker (Recommended for development)
```bash
# Start PostgreSQL and Redis containers
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait a few seconds for containers to start
sleep 5
```

### Option B: Local Installation
If you have PostgreSQL and Redis installed locally:

1. Create a database:
```sql
CREATE DATABASE discord_bot_dev;
CREATE USER bot_user WITH ENCRYPTED PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE discord_bot_dev TO bot_user;
```

2. Start Redis:
```bash
redis-server
```

## 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env
```

### Required Environment Variables

You need to set these in your `.env` file:

```env
# Discord Bot (Get from Discord Developer Portal)
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Database (Use Docker values or your local setup)
DATABASE_URL="postgresql://bot_user:dev_password@localhost:5433/discord_bot_dev"

# Redis (Use Docker values or your local setup)  
REDIS_URL="redis://localhost:6380"

# Development Settings
SESSION_SECRET=dev_session_secret_change_in_production
JWT_SECRET=dev_jwt_secret_change_in_production
DEFAULT_PREFIX=!
OWNER_IDS=your_discord_user_id_here
```

## 4. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the bot token and add it to your `.env` file
5. Enable these intents:
   - Server Members Intent
   - Message Content Intent
6. Go to "General Information" and copy the Application ID (Client ID)

### Bot Permissions

Your bot needs these permissions:
- View Channels
- Send Messages  
- Embed Links
- Attach Files
- Read Message History
- Use Slash Commands
- Manage Messages (for moderation)
- Kick Members (for moderation)
- Ban Members (for moderation)
- Manage Roles (for moderation)
- Connect & Speak (for music)

### Invite Link Generator
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```
Replace `YOUR_CLIENT_ID` with your bot's client ID.

## 5. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations  
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## 6. Deploy Slash Commands

```bash
# Deploy commands to a test guild (instant)
npm run deploy YOUR_GUILD_ID

# Or deploy globally (takes up to 1 hour)
npm run deploy
```

## 7. Start Development

```bash
# Start the bot in development mode with hot reload
npm run dev
```

You should see output like:
```
[INFO] Connected to PostgreSQL database
[INFO] Connected to Redis  
[INFO] Loaded 8 commands
[INFO] Bot is ready! Logged in as YourBot#1234
[INFO] Connected to 1 guild(s)
```

## 8. Testing

Test your bot by running these commands in Discord:
- `/help` - Show command help
- `/ping` - Check bot latency
- `/setup view` - View server settings
- `/8ball What's for lunch?` - Fun command

## Development Tools

### Useful Commands
```bash
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run lint         # Check for errors
npm run format       # Format code
npm run test         # Run tests
npm run deploy       # Deploy slash commands
```

### Database Management
```bash
npx prisma studio           # Visual database browser
npx prisma migrate dev      # Create new migration
npx prisma db push          # Push schema without migration
npx prisma generate         # Regenerate client
```

### Docker Development
```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f bot-dev

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Troubleshooting

### Common Issues

**"Cannot find module discord.js"**
- Run `npm install` to install dependencies

**"Missing required environment variable"**
- Check your `.env` file has all required variables
- Make sure `.env` is in the project root directory

**"Database connection failed"**
- Ensure PostgreSQL is running
- Check your DATABASE_URL is correct
- For Docker: make sure containers are running

**"Redis Client Error"**
- Ensure Redis is running
- Check your REDIS_URL is correct
- For Docker: make sure Redis container is running

**"Unknown interaction" when using commands**
- Deploy slash commands: `npm run deploy YOUR_GUILD_ID`
- Make sure bot has "applications.commands" scope

**Bot doesn't respond to commands**
- Check bot permissions in Discord server
- Ensure bot has "Use Slash Commands" permission
- Check console for error message

### Getting Help

- Check the [README.md](README.md) for full documentation
- Look at existing commands in `src/commands/` for examples
- Check the [Discord.js Guide](https://discordjs.guide/)
- Join our support server: [Discord Invite]

## What's Next?

Once you have the bot running:

1. **Explore the Code**: Look at the command and event files to understand the structure
2. **Add Features**: Try creating your own commands
3. **Customize Settings**: Use `/setup` commands to configure the bot
4. **Add Modules**: Implement music, tickets, or other features
5. **Deploy**: Set up production deployment with Docker

Happy coding! 🎉