import { BadRequestError, ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import type { GetMatchesPayload } from '../../interfaces';
import { MatchRepository } from '../../repository';

export class GetMatches {
    constructor(private readonly matchRepository: MatchRepository) {}

    /**
     * Retrieves stored matches for an event, sorted by score descending.
     * Optionally filters by a specific attendee.
     */
    handle = async (payload: ControllerArgs<GetMatchesPayload>) => {
        const { params, query, request } = payload;
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        if (!params?.eventId) throw new BadRequestError('Event ID is required');

        const matches = await this.matchRepository.findByEvent(params.eventId, currentTenant.id!, {
            attendeeId: query?.attendeeId,
            page: query?.page ?? 1,
            pageSize: query?.pageSize ?? 20,
        });

        return {
            code: HttpStatus.OK,
            message: 'Matches Fetched Successfully',
            data: matches,
        };
    };
}

const getMatchesInstance = new GetMatches(new MatchRepository());
export default getMatchesInstance;
