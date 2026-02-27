import { ControlBuilder } from '@/core';
import { Router } from 'express';
import {
    listAttendees,
    registerAttendee,
    updateAttendee,
    deleteAttendee,
    bulkRegister,
} from '../services';
import {
    listAttendeesQuerySchema,
    registerAttendeeSchema,
    updateAttendeeSchema,
    deleteAttendeeSchema,
    bulkRegisterSchema,
} from './schema';

export const attendeeRouter = Router();

// POST /attendees/:eventId — Register attendee for an event + trigger incremental matching
attendeeRouter.post(
    '/:eventId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(registerAttendeeSchema)
        .setHandler(registerAttendee.handle)
        .handle(),
);

// POST /attendees/:eventId/bulk — Bulk register attendees
attendeeRouter.post(
    '/:eventId/bulk',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(bulkRegisterSchema)
        .setHandler(bulkRegister.handle)
        .handle(),
);

// GET /attendees/:eventId — List attendees for an event
attendeeRouter.get(
    '/:eventId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(listAttendeesQuerySchema)
        .setHandler(listAttendees.handle)
        .handle(),
);

// PATCH /attendees/:eventId/:attendeeId — Update an attendee
attendeeRouter.patch(
    '/:eventId/:attendeeId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(updateAttendeeSchema)
        .setHandler(updateAttendee.handle)
        .handle(),
);

// DELETE /attendees/:eventId/:attendeeId — Soft-delete an attendee
attendeeRouter.delete(
    '/:eventId/:attendeeId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(deleteAttendeeSchema)
        .setHandler(deleteAttendee.handle)
        .handle(),
);
