# Discord Bot Project

## Overview

This is a comprehensive, multi-purpose Discord bot built with TypeScript and Discord.js v14. The bot features a modular architecture with extensive functionality including moderation tools, anti-nuke protection, automod systems, fun commands, media processing, and a web dashboard. The system is designed to be production-ready with proper logging, rate limiting, database integration, and scalable architecture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
- **Framework**: Discord.js v14 with TypeScript for type safety and modern JavaScript features
- **Database**: Prisma ORM with PostgreSQL for data persistence and schema management
- **Caching**: Redis for session storage, rate limiting, and temporary data caching
- **Web Server**: Express.js for the dashboard API with security middleware (Helmet, CORS)
- **Command System**: Slash commands with modular command loading from organized directories
- **Event Handling**: Event-driven architecture with proper error handling and logging

### Bot Client Architecture
- **Extended Client**: Custom BotClient interface extending Discord.js Client with additional properties
- **Command Collection**: Map-based command storage for efficient command lookup and execution
- **Rate Limiting**: Built-in rate limiter with Redis persistence and configurable limits per command category
- **Permission System**: Role hierarchy validation and owner/admin permission checks
- **Graceful Degradation**: Bot can run in dashboard-only mode without Discord credentials

### Database Design
- **Prisma Schema**: Type-safe database operations with automatic migration management
- **Guild Settings**: Flexible JSON configuration storage for per-server customization
- **Moderation Logs**: Comprehensive audit trail with case IDs and evidence support
- **Anti-Nuke Settings**: Configurable protection thresholds and automated response actions

### Command Architecture
- **Modular Organization**: Commands organized by category (moderation, fun, media, automod, etc.)
- **Validation Layer**: Input sanitization, permission checks, and error handling
- **Interaction Handling**: Support for slash commands, buttons, select menus, and modals
- **Rate Limiting**: Per-user and per-guild rate limits with different thresholds for command categories

### Security & Anti-Nuke System
- **Multi-Layer Protection**: Configurable thresholds for various server actions (bans, kicks, deletions)
- **Real-time Monitoring**: Event-based detection of suspicious activities
- **Automated Response**: Configurable actions including role removal, channel lockdown, and notifications
- **Appeal System**: Built-in moderation appeal and override functionality

### Media Processing
- **Image Manipulation**: Sharp-based image processing for resizing, compression, watermarking
- **Format Conversion**: Support for multiple image formats (PNG, JPEG, WebP, GIF)
- **Sticker Creation**: Automated sticker format conversion with transparency support
- **File Validation**: Comprehensive file type and size validation for security

### Logging & Monitoring
- **Winston Logger**: Structured logging with daily rotation and multiple transports
- **Audit Trails**: Comprehensive moderation action logging with evidence support
- **Performance Monitoring**: Uptime tracking, latency monitoring, and error reporting
- **Security Alerts**: Real-time threat detection and notification system

### Dashboard Integration
- **React Frontend**: Modern web interface for bot configuration and monitoring
- **Discord OAuth2**: Secure authentication using Discord's OAuth2 flow
- **Real-time Updates**: Live configuration changes without bot restarts
- **Analytics Dashboard**: Usage statistics and performance metrics visualization

## External Dependencies

### Core Discord Integration
- **Discord.js v14**: Primary Discord API wrapper with full feature support
- **Discord REST API**: Direct API integration for advanced functionality
- **Discord Voice**: Audio streaming capabilities for music features

### Database & Storage
- **PostgreSQL**: Primary database for persistent data storage
- **Prisma ORM**: Type-safe database operations and schema management
- **Redis**: Session storage, caching, and rate limiting backend

### Web Framework & Security
- **Express.js**: Web server for dashboard API endpoints
- **Helmet**: Security headers and protection middleware
- **CORS**: Cross-origin resource sharing configuration
- **Passport.js**: Authentication middleware with Discord strategy

### Media & File Processing
- **Sharp**: High-performance image processing and manipulation
- **Axios**: HTTP client for external API requests and file downloads

### Utilities & Infrastructure
- **Winston**: Advanced logging with rotation and multiple outputs
- **Bull**: Job queue system for background task processing
- **Node-cron**: Scheduled task execution for maintenance and cleanup
- **Joi**: Input validation and schema enforcement
- **bcrypt**: Password hashing for secure authentication
- **jsonwebtoken**: JWT token generation for API authentication

### Development & Testing
- **TypeScript**: Static typing and advanced language features
- **Jest**: Unit testing framework with coverage reporting
- **ESLint**: Code linting with TypeScript-specific rules
- **Prettier**: Code formatting for consistent style