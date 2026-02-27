import { ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import { ListEventsPayload } from '../../interfaces';
import { EventRepository } from '../../repository';

export class GetAllEvents {
    constructor(private readonly eventRepository: EventRepository) {}

    handle = async (payload: ControllerArgs<ListEventsPayload>) => {
        const { query, request } = payload;
        const currentTenant = request.tenant;

        if (!currentTenant) throw new UnAuthorizedError(`Invalid Tenant!`);

        const events = await this.eventRepository.findMany({
            filters: {
                tenant_id: currentTenant.id!,
            },
            pagination: {
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 10,
            },
        });

        const convertedEvents = events?.map(this.eventRepository.mapToCamelCase) ?? [];

        return {
            code: HttpStatus.OK,
            message: 'Events Fetched Successfully',
            data: convertedEvents,
        };
    };
}

const getAllEvents = new GetAllEvents(new EventRepository());

export default getAllEvents;
