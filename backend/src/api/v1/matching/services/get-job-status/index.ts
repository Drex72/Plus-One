import { BadRequestError, ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import type { MatchingJob } from '../../interfaces';
import { MatchRepository } from '../../repository';

export interface GetJobStatusPayload {
    params: { eventId: string; jobId: string };
}

export class GetJobStatus {
    constructor(private readonly matchRepository: MatchRepository) {}

    /**
     * Retrieves a matching job's status by ID, scoped to the authenticated tenant.
     */
    handle = async (payload: ControllerArgs<GetJobStatusPayload>) => {
        const { params, request } = payload;
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        if (!params?.eventId) throw new BadRequestError('Event ID is required');
        if (!params?.jobId) throw new BadRequestError('Job ID is required');

        const job = await this.matchRepository.getJobById(params.jobId, currentTenant.id!);
        if (!job) throw new BadRequestError('Matching job not found');

        // Verify the job belongs to the requested event
        if (job.eventId !== params.eventId) {
            throw new BadRequestError('Matching job not found');
        }

        return {
            code: HttpStatus.OK,
            message: 'Matching job fetched successfully',
            data: job,
        };
    };
}

const getJobStatusInstance = new GetJobStatus(new MatchRepository());
export default getJobStatusInstance;
