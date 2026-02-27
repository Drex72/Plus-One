import { app, dispatch } from '@/app';
import { config } from '@/core';
import { createServer } from 'http';

export const startApp = async () => {
    const server = createServer(app);

    server.listen(config.port, () => dispatch('app:up'));
};
