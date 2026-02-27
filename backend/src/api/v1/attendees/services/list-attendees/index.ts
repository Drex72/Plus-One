import { ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import { ListAttendeesPayload } from '../../interfaces';
import { AttendeeRepository } from '../../repository';

export class GetAllAttendees {
    constructor(private readonly attendeeRepository: AttendeeRepository) {}

    handle = async (payload: ControllerArgs<ListAttendeesPayload>) => {
        const { query, params, request } = payload;
        const currentTenant = request.tenant;

        if (!currentTenant) throw new UnAuthorizedError(`Invalid Tenant!`);

        const attendees = await this.attendeeRepository.findMany({
            filters: {
                tenant_id: currentTenant.id!,
                event_id: params.eventId,
            },
            pagination: {
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 100,
            },
        });

        const convertedAttendees = attendees?.map(this.attendeeRepository.mapToCamelCase) ?? [];

        return {
            code: HttpStatus.OK,
            message: 'Events Fetched Successfully',
            data: convertedAttendees,
        };
    };
}

const getAllAttendees = new GetAllAttendees(new AttendeeRepository());
export default getAllAttendees;
