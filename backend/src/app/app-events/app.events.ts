import { AppEventsInterface, EventRegister } from './event.types';
import { registerEvents } from './events.register';

/**
 * Class representing the application event manager.
 */
export class AppEventManager {
    private handlers: Map<keyof AppEventsInterface, Array<Function>> = new Map();

    constructor(registerFn: (bus: AppEventManager) => void) {
        registerFn(this);
        this.dispatch('event:registration:successful');
    }

    /**
     * Dispatches an event with optional parameters.
     * @template T - The event key that extends the predefined event keys.
     * @param {T} event - The event key to dispatch.
     * @param {...AppEventListnerMap[T]} values - The parameters to pass with the event.
     * @returns {Promise<void>} A promise that resolves when the event has been dispatched.
     */
    public async dispatch<K extends keyof AppEventsInterface>(
        eventName: K,
        ...args: AppEventsInterface[K]['data'] extends void ? [] : [AppEventsInterface[K]['data']]
    ): Promise<AppEventsInterface[K]['return'][]> {
        const handlers = this.handlers.get(eventName) || [];

        if (handlers.length === 0) {
            return [];
        }

        const data = args[0] as EventRegister[K];
        const results: AppEventsInterface[K]['return'][] = [];

        // Execute all handlers and collect their responses
        for (const handler of handlers) {
            try {
                const result = await handler(data);
                if (result !== undefined) {
                    results.push(result);
                }
            } catch (error) {
                console.error(`Error in handler for event '${String(eventName)}':`, error);
                throw error;
            }
        }

        return results;
    }

    /**
     * Registers an event handler that can return a value.
     * @template K - The event key from AppEventsInterface
     * @param {K} eventName - The event name to listen for
     * @param {Function} handler - The handler function that processes the event
     * @returns {Function} Unsubscribe function
     */
    public onEvent<K extends keyof AppEventsInterface>(
        eventName: K,
        handler: (data: EventRegister[K]) => Promise<AppEventsInterface[K]['return']> | AppEventsInterface[K]['return'],
    ) {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }
        this.handlers.get(eventName)!.push(handler);

        return () => {
            const handlers = this.handlers.get(eventName);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }
}

export const eventBus = new AppEventManager(registerEvents);
export const dispatch = eventBus.dispatch.bind(eventBus);
