import { BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { CreateEventPayload } from '../../interfaces';
import { EventRepository } from '../../repository';

export class CreateEvent extends BaseService {
    constructor(private readonly eventRepository: EventRepository) {
        super();
    }

    handle = async ({ input, request }: ControllerArgs<CreateEventPayload>) => {
        const currentTenant = request.tenant;

        if (!currentTenant) throw new UnAuthorizedError(`Invalid Tenant!`);

        const { name, matchingConfig, description, endsAt, startsAt } = input;

        const event = await this.eventRepository.createEvent(currentTenant.id!, {
            name: name.toLocaleLowerCase(),
            matchingConfig,
            description,
            endsAt,
            startsAt,
        });

        logger.info('Event Created Successfully');

        return {
            data: event,
            code: HttpStatus.CREATED,
            message: 'Event Created Successfully',
        };
    };
}

const createEventInstance = new CreateEvent(new EventRepository());
export default createEventInstance;
