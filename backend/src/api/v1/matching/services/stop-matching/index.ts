import { dispatch } from '@/app';
import { BadRequestError, BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { MatchRepository } from '../../repository';

interface StopMatchingPayload {
    params: { eventId: string };
}

export class StopMatchingEvent extends BaseService {
    constructor(private readonly matchRepository: MatchRepository) {
        super();
    }

    /**
     * Stops continuous matching for an event.
     *
     * Transitions the event status from 'matching' back to 'active',
     * allowing attendees to keep registering without being auto-added to the pool.
     */
    handle = async ({ request, params }: ControllerArgs<StopMatchingPayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const [event] = await dispatch('event:get-by-id', { eventId: params.eventId });
        if (!event) throw new BadRequestError('Event not found');
        if (event.tenantId !== currentTenant.id) throw new BadRequestError('Event not found');

        if (event.status !== 'matching') {
            throw new BadRequestError(`Event is not in matching state (status: ${event.status})`);
        }

        await this.matchRepository.updateEventStatus(params.eventId, currentTenant.id!, 'active');

        logger.info(`Matching stopped for event ${params.eventId} — status reverted to 'active'`);

        return {
            data: { eventId: params.eventId, status: 'active' },
            code: HttpStatus.OK,
            message: 'Matching stopped successfully',
        };
    };
}

const stopMatchingInstance = new StopMatchingEvent(new MatchRepository());
export default stopMatchingInstance;
