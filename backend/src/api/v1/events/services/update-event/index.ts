import { BadRequestError, ControllerArgs, HttpStatus } from '@/core';
import { UnAuthorizedError } from '@/core/errors';
import { UpdateEventPayload } from '../../interfaces';
import { EventRepository } from '../../repository';

export class UpdateEventById {
    constructor(private readonly eventRepository: EventRepository) {}

    handle = async (payload: ControllerArgs<UpdateEventPayload>) => {
        const { request, params, input } = payload;

        const currentTenant = request.tenant;

        if (!currentTenant) throw new UnAuthorizedError(`Invalid Tenant!`);

        const existing = await this.eventRepository.findById(params.eventId);
        if (!existing) throw new BadRequestError('Event not found');

        const updatedEvent = await this.eventRepository.updateById(params.eventId, input);
        const convertedEvent = this.eventRepository.mapToCamelCase(updatedEvent);

        return {
            code: HttpStatus.OK,
            message: 'Event Updated Successfully',
            data: convertedEvent,
        };
    };
}

const updateEventById = new UpdateEventById(new EventRepository());

export default updateEventById;
