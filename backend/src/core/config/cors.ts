import type { CorsOptions } from 'cors';
import { config } from './config';

const allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

const allowedHeaders: string[] = ['Content-Type', 'Authorization', 'X-API-Key'];

/**
 * In production/staging, restrict CORS to explicit origins from CORS_ORIGINS env var
 * (comma-separated). In development, allow all origins.
 */
function resolveOrigin(): CorsOptions['origin'] {
    if (config.appEnvironment === 'development') return '*';
    const raw = config.corsOrigins;
    if (!raw) return '*';
    const origins = raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    return origins.length > 0 ? origins : '*';
}

export const corsOptions: CorsOptions = {
    methods: allowedMethods,
    allowedHeaders,
    origin: resolveOrigin(),
};
