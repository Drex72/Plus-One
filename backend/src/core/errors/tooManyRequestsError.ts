import { HttpStatus } from '../utils';
import { ApiError, type ErrorDetailsDescriptor } from './apiError';

export class TooManyRequestsError extends ApiError {
    _statusCode = HttpStatus.RATE_LIMITED;
    _message: string;
    _details = null;

    constructor(message: string) {
        super(message);
        this._message = message;

        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    }

    get statusCode(): number {
        return this._statusCode;
    }

    get message(): string {
        return this._message;
    }

    get details(): ErrorDetailsDescriptor {
        return this._details;
    }
}
