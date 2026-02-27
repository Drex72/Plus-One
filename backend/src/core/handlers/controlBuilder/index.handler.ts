import { HttpStatus, logger } from '@/core';
import type { AnyFunction, ExpressCallbackFunction } from '@/core/types';
import type { NextFunction, Request, Response } from 'express';
import { ControllerHandlerOptions, ValidationSchema } from './index.interface';
import { handlePrivateRequest, parseIncomingRequest, validateIncomingRequest } from './index.utils';

/**
 * Handles HTTP requests by providing methods for authentication, authorization, validation, and controller execution.
 */
export class ControllerHandler {
    /**
     * Creates a middleware function to handle the request and execute the controller function.
     *
     * This method sets up a middleware function that:
     * - Parses the incoming request to extract controller arguments.
     * - Optionally handles private requests, including authentication and authorization.
     * - Validates the request data against a provided schema if one is specified.
     * - Executes the controller function with the parsed arguments.
     * - Handles the controller's response, setting appropriate HTTP status codes and headers.
     *
     * @param {AnyFunction} controllerFn The controller function to execute.
     * @param {ValidationSchema} [schema={}] The schema to validate the request data against.
     * @param {ControllerHandlerOptions} options Configuration options for handling the request.
     * @returns {ExpressCallbackFunction} The Express middleware function.
     */
    handle = (controllerFn: AnyFunction, schema: ValidationSchema | undefined = {}, options: ControllerHandlerOptions): ExpressCallbackFunction => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (options.isPrivate) {
                    await handlePrivateRequest(req);
                }

                const controllerArgs = parseIncomingRequest(req);

                if (schema) validateIncomingRequest(schema, controllerArgs);

                const controllerResult = await controllerFn(controllerArgs);

                if (!controllerResult) {
                    res.status(HttpStatus.OK).send({ status: true });

                    return;
                }

                const { code, headers, ...data } = controllerResult;

                res.set({ ...headers })
                    .status(code ?? HttpStatus.OK)
                    .send(data);
            } catch (error) {
                logger.error(`Controller-Handler Error: ${error}`);

                next(error);
            }
        };
    };
}
