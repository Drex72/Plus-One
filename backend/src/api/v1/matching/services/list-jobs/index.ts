import { BadRequestError, ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import type { ListJobsPayload } from '../../interfaces';
import { MatchRepository } from '../../repository';

export class ListJobs {
    constructor(private readonly matchRepository: MatchRepository) {}

    handle = async (payload: ControllerArgs<ListJobsPayload>) => {
        const { params, query, request } = payload;
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        if (!params?.eventId) throw new BadRequestError('Event ID is required');

        const jobs = await this.matchRepository.listJobsByEvent(params.eventId, currentTenant.id!, {
            page: query?.page ?? 1,
            pageSize: query?.pageSize ?? 20,
        });

        return {
            code: HttpStatus.OK,
            message: 'Jobs listed successfully',
            data: jobs,
        };
    };
}

const listJobsInstance = new ListJobs(new MatchRepository());
export default listJobsInstance;
