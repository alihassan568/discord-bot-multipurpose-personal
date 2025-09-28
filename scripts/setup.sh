#!/bin/bash

# Discord Bot Setup Script
# This script helps set up the bot for development or production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Some features may not work."
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    log_success "Requirements check passed!"
}

# Setup environment file
setup_env() {
    log_info "Setting up environment file..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "Created .env file from .env.example"
            log_warning "Please edit .env file with your Discord bot token and other configuration"
        else
            log_error ".env.example file not found!"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    npm install
    log_success "Dependencies installed successfully!"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    if [ "$1" = "dev" ]; then
        log_info "Starting development database with Docker..."
        docker compose -f docker-compose.dev.yml up -d postgres redis
        
        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        sleep 10
        
        # Set development database URL
        export DATABASE_URL="postgresql://bot_user:dev_password@localhost:5433/discord_bot_dev"
    fi
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    log_info "Running database migrations..."
    npx prisma migrate dev --name init
    
    log_success "Database setup completed!"
}

# Build the project
build_project() {
    log_info "Building project..."
    npm run build
    log_success "Project built successfully!"
}

# Start the bot
start_bot() {
    log_info "Starting the bot..."
    
    if [ "$1" = "dev" ]; then
        npm run dev
    else
        npm start
    fi
}

# Main setup function
main() {
    echo "======================================"
    echo "     Discord Bot Setup Script"
    echo "======================================"
    echo ""
    
    MODE=${1:-"dev"}
    
    if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
        log_error "Invalid mode. Use 'dev' for development or 'prod' for production."
        echo "Usage: $0 [dev|prod]"
        exit 1
    fi
    
    log_info "Setting up in $MODE mode..."
    echo ""
    
    check_requirements
    setup_env
    install_deps
    
    if [ "$MODE" = "dev" ]; then
        setup_database dev
        log_success "Development setup completed!"
        echo ""
        log_info "To start the bot in development mode, run:"
        echo "  npm run dev"
        echo ""
        log_info "To access the database, run:"
        echo "  npx prisma studio"
        echo ""
        log_info "Development services are running at:"
        echo "  Bot: http://localhost:3000"
        echo "  Database: localhost:5433"
        echo "  Redis: localhost:6380"
    else
        build_project
        log_success "Production setup completed!"
        echo ""
        log_info "To start in production mode:"
        echo "  docker-compose up -d"
        echo ""
        log_info "Make sure to:"
        echo "  1. Set your Discord bot token in .env"
        echo "  2. Configure your database and Redis URLs"
        echo "  3. Set secure passwords for production"
    fi
    
    echo ""
    log_info "Next steps:"
    echo "  1. Create a Discord application at https://discord.com/developers/applications"
    echo "  2. Create a bot and copy the token to your .env file"
    echo "  3. Invite the bot to your server with appropriate permissions"
    echo "  4. Configure the bot settings using /setup command"
    echo ""
    log_success "Setup complete! Happy coding! 🚀"
}

# Run main function with all arguments
main "$@"