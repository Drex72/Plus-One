import { ControlBuilder } from '@/core';
import { Router } from 'express';
import { createEvent, getEvent, listEvents, updateEvent } from '../services';
import {
    createEventSchema,
    eventParamsSchema,
    listEventsQuerySchema,
    updateEventSchema,
} from './schema';

export const eventRouter = Router();

eventRouter.post(
    '/',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(createEventSchema)
        .setHandler(createEvent.handle)
        .handle(),
);

eventRouter.get(
    '/',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(listEventsQuerySchema)
        .setHandler(listEvents.handle)
        .handle(),
);

eventRouter.get(
    '/:eventId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(eventParamsSchema)
        .setHandler(getEvent.handle)
        .handle(),
);

eventRouter.patch(
    '/:eventId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(updateEventSchema)
        .setHandler(updateEvent.handle)
        .handle(),
);
