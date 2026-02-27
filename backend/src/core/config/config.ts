import * as dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

type INodeEnv = 'development' | 'production' | 'staging';

const envSchema = Joi.object({
    // App
    PORT: Joi.number().required(),
    HOST: Joi.string().required(),
    NODE_ENV: Joi.string().valid('development', 'production', 'staging').required(),
    SESSION_SECRET: Joi.string().min(32).required(),
    CORS_ORIGINS: Joi.string().allow('').optional(),

    // Database
    SUPABASE_URL: Joi.string().required(),
    SUPABASE_SERVICE_KEY: Joi.string().required(),

    // Cache
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().allow('').required(),
    REDIS_TTL: Joi.number().required(),

    // Matching
    MATCH_THRESHOLD: Joi.number().required(),
    ANN_CANDIDATES: Joi.number().required(),
    MAX_BATCH_SIZE: Joi.number().required(),
    WORKER_CONCURRENCY: Joi.number().required(),

    // OpenAI (optional — enables semantic similarity matching)
    OPENAI_API_KEY: Joi.string().allow('').optional(),

    // Webhook
    WEBHOOK_MAX_ATTEMPTS: Joi.number().required(),
    WEBHOOK_BASE_DELAY_MS: Joi.number().required(),
    WEBHOOK_TIMEOUT_MS: Joi.number().required(),
}).unknown();

const { value: validatedEnvVars, error: validationError } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (validationError) {
    throw new Error(`Config validation error: ${validationError.message}`);
}

export const config = Object.freeze({
    port: validatedEnvVars.PORT,
    appEnvironment: validatedEnvVars.NODE_ENV as INodeEnv,
    host: validatedEnvVars.HOST,
    sessionSecret: validatedEnvVars.SESSION_SECRET as string,
    corsOrigins: validatedEnvVars.CORS_ORIGINS as string | undefined,

    db: {
        supabaseUrl: validatedEnvVars.SUPABASE_URL,
        supabaseServiceKey: validatedEnvVars.SUPABASE_SERVICE_KEY,
    },

    cache: {
        port: validatedEnvVars.REDIS_PORT,
        host: validatedEnvVars.REDIS_HOST,
        password: validatedEnvVars.REDIS_PASSWORD,
    },

    matching: {
        threshold: validatedEnvVars.MATCH_THRESHOLD,
        annCandidates: validatedEnvVars.ANN_CANDIDATES,
        maxBatchSize: validatedEnvVars.MAX_BATCH_SIZE,
        workerConcurrency: validatedEnvVars.WORKER_CONCURRENCY,
    },

    openai: {
        apiKey: (validatedEnvVars.OPENAI_API_KEY as string) || '',
    },

    webhook: {
        maxAttempts: validatedEnvVars.WEBHOOK_MAX_ATTEMPTS,
        baseDelayMs: validatedEnvVars.WEBHOOK_BASE_DELAY_MS,
        timeoutMs: validatedEnvVars.WEBHOOK_TIMEOUT_MS,
    },
});
