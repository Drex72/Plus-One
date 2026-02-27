import { Logger } from 'winston';
import { config, prodDevLogger, buildDevLogger } from '@/core';

export const logger: Logger = config.appEnvironment === 'production' ? prodDevLogger() : buildDevLogger();
