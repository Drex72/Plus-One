import { HttpStatus } from '@/core';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { eventRouter } from '~/events';
import { tenantRouter } from '~/tenants';
import { attendeeRouter } from '~/attendees';
import { matchRouter } from '~/matching';
import { swaggerSpec } from './app.swagger';

export const appRouter = Router();

appRouter.use('/tenants', tenantRouter);
appRouter.use('/events', eventRouter);
appRouter.use('/attendees', attendeeRouter);
appRouter.use('/matching', matchRouter);

appRouter.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Plus One API Docs',
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            filter: true,
        },
    }),
);

appRouter.get('/health', (_, res) => {
    res.status(HttpStatus.OK).json({
        message: 'Api up',
        version: '1.0',
    });
});
