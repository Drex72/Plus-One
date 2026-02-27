import { BadRequestError, ControllerArgs, HttpStatus } from '@/core';
import { GetEventPayload } from '../../interfaces';
import { EventRepository } from '../../repository';

export class GetEventById {
    constructor(private readonly eventRepository: EventRepository) {}
    handle = async (payload: ControllerArgs<GetEventPayload>) => {
        const { params } = payload;

        if (!params) throw new BadRequestError(`Invalid Event ID`);

        const { eventId } = params;

        const event = await this.eventRepository.findById(eventId);

        if (!event) throw new BadRequestError('Event not found');
        const convertedEvent = this.eventRepository.mapToCamelCase(event);

        return {
            code: HttpStatus.OK,
            message: 'Event Fetched Successfully',
            data: convertedEvent,
        };
    };
}

const getEventById = new GetEventById(new EventRepository());

export default getEventById;
