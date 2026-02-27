import rateLimit from 'express-rate-limit';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export const globalRateLimiter = rateLimit({
    windowMs: TWELVE_HOURS_MS,
    max: 400,
    message: 'You have exceeded the 400 requests in 12 hours limit!',
    standardHeaders: true,
    legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
    windowMs: SIX_HOURS_MS,
    max: 10,
    message: 'You have exceeded the 10 requests in 6 hours limit!',
    standardHeaders: true,
    legacyHeaders: false,
});
