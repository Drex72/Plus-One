import type { AnyFunction } from '@/core/types';
import { ControllerHandler } from './index.handler';
import { ControllerHandlerOptions, ValidationSchema } from './index.interface';

/**
 * Builder class for setting up and configuring a controller handler.
 * This class allows fluent style configuration by chaining method calls.
 */
export class ControlBuilder {
    private handler!: AnyFunction;

    private schema: ValidationSchema | undefined;

    private options: ControllerHandlerOptions = {
        isPrivate: false,
    };

    /**
     * Initializes and returns a new instance of ControlBuilder.
     * @returns {ControlBuilder} A new instance of ControlBuilder.
     * @static
     */
    static builder() {
        return new ControlBuilder();
    }

    /**
     * Sets the handler function that will be used to process requests.
     * @param {AnyFunction} func - The function to handle the request.
     * @returns {ControlBuilder} The instance of this builder for chaining.
     */
    setHandler(func: AnyFunction) {
        this.handler = func;
        return this;
    }

    /**
     * Sets the validation schema for validating request data.
     * @param {ValidationSchema} schema - The schema to validate the request data.
     * @returns {ControlBuilder} The instance of this builder for chaining.
     */
    setValidator(schema: ValidationSchema) {
        this.schema = schema;
        return this;
    }

    /**
     * Marks the route as requiring authentication.
     * @returns {ControlBuilder} The instance of this builder for chaining.
     */
    isPrivate() {
        this.options = { ...this.options, isPrivate: true };

        return this;
    }


    /**
     * Builds and returns the controller handler with the configured settings.
     * @returns {ExpressCallbackFunction} The middleware function that handles the request.
     */
    handle() {
        return new ControllerHandler().handle(this.handler, this.schema, this.options);
    }
}
