import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors';
import { logger } from '../logging';
import { HttpStatus } from '../utils';

export class ErrorHandler {
    handle = async (error: Error, _: Request, res: Response, __: NextFunction) => {
        let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = error?.message ?? 'internal server error';

        if (error instanceof ApiError) {
            logger.error('Error in middleware', error);
            statusCode = error.statusCode;
            message = error.message;
        }

        if (statusCode == HttpStatus.INTERNAL_SERVER_ERROR) logger.error(error);

        const response = {
            status: false,
            code: statusCode,
            message,
        };

        return res.status(statusCode).json({ ...response });
    };
}
