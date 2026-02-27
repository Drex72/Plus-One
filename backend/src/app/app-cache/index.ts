import { Redis, type RedisOptions } from 'ioredis';
import { logger, config } from '@/core';

export class AppCacheManager extends Redis {
    constructor(options: RedisOptions) {
        super(options);

        logger.info('cache:connection:established');

        super.on('close', () => {
            this.quit();
            logger.debug('Cache connection closed');
        });
    }

    read = async <T = any>(key: string): Promise<T | null> => {
        const value: string | null = await this.get(key);

        if (!value) return null;

        return (await JSON.parse(value!)) as T | null;
    };

    has = async (key: string): Promise<boolean> => {
        return (await this.get(key)) ? true : false;
    };

    remove = async (key: string) => {
        try {
            const keyExists = await this.has(key);

            if (!keyExists) throw new Error(`You tried removing the cache with a key[${key}] that does not exists.`);

            await this.del(key);

            return true;
        } catch (err: unknown) {
            logger.debug('Operation failed, key not found in cache');
            // throw the error back to the consumer of the method to handle it.
            throw err;
        }
    };
}

export const cache = new AppCacheManager({
    host: config.cache.host,
    port: config.cache.port,
    password: config.cache.password,
});
