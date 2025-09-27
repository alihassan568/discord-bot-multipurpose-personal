import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { Logger } from '../types';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : ''
            }`;
    })
);

const createLogger = (): Logger => {
    const logDir = process.env.LOG_DIR || './logs';

    const winstonLogger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        transports: [
            // Console transport
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                ),
            }),

            // File transport for all logs
            new DailyRotateFile({
                filename: path.join(logDir, 'bot-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                format: winston.format.combine(
                    winston.format.json()
                ),
            }),

            // Error file transport
            new DailyRotateFile({
                filename: path.join(logDir, 'error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: '20m',
                maxFiles: '30d',
                format: winston.format.combine(
                    winston.format.json()
                ),
            }),
        ],
    });

    return {
        info: (message: string, meta?: any): void => {
            winstonLogger.info(message, meta);
        },
        warn: (message: string, meta?: any): void => {
            winstonLogger.warn(message, meta);
        },
        error: (message: string, meta?: any): void => {
            winstonLogger.error(message, meta);
        },
        debug: (message: string, meta?: any): void => {
            winstonLogger.debug(message, meta);
        },
    };
};

export { createLogger };