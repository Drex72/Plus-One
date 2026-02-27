import { BadRequestError, ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import type { UpdateMatchStatusPayload } from '../../interfaces';
import { MatchRepository } from '../../repository';

export class UpdateMatchStatus {
    constructor(private readonly matchRepository: MatchRepository) {}

    handle = async (payload: ControllerArgs<UpdateMatchStatusPayload>) => {
        const { params, input, request } = payload;
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        if (!params?.eventId) throw new BadRequestError('Event ID is required');
        if (!params?.matchId) throw new BadRequestError('Match ID is required');
        if (!input?.status) throw new BadRequestError('Status is required');

        const match = await this.matchRepository.updateMatchStatus(params.matchId, currentTenant.id!, input.status);

        // When a match is rejected, send both attendees back to the matching pool
        // so they can be re-matched when new potential partners join.
        if (input.status === 'rejected') {
            await this.matchRepository.updateAttendeeStatuses([match.attendeeAId, match.attendeeBId], 'in_pool');
        }

        // When a match is confirmed, mark both attendees as matched
        if (input.status === 'confirmed') {
            await this.matchRepository.updateAttendeeStatuses([match.attendeeAId, match.attendeeBId], 'matched');
        }

        return {
            code: HttpStatus.OK,
            message: `Match ${input.status}${input.status === 'rejected' ? ' — attendees returned to pool' : ''}`,
            data: match,
        };
    };
}

const updateMatchStatusInstance = new UpdateMatchStatus(new MatchRepository());
export default updateMatchStatusInstance;
