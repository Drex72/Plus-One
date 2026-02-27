import { logger } from '@/core';
import { EventRepository } from './repository';

export async function getEventByIdListener(eventId: string) {
    const eventRepository = new EventRepository();
    logger.debug(`Fetching event by ID: ${eventId}`);
    const existingEvent = await eventRepository.findById(eventId);
    if (!existingEvent) return null;

    return eventRepository.mapToCamelCase(existingEvent);
}
