import { dispatch } from '@/app';
import { BadRequestError, BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { AttendeeRepository } from '../../repository';

interface BulkRegisterPayload {
    params: { eventId: string };
    input: {
        attendees: Array<{
            name: string;
            email?: string;
            externalId?: string;
            profile: Record<string, unknown>;
            preferences?: Array<{ field: string; value: unknown[]; type: 'in' | 'range' }>;
        }>;
    };
}

export class BulkRegisterAttendees extends BaseService {
    constructor(private readonly attendeeRepository: AttendeeRepository) {
        super();
    }

    handle = async ({ input, request, params }: ControllerArgs<BulkRegisterPayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const [event] = await dispatch('event:get-by-id', { eventId: params.eventId });
        if (!event) throw new BadRequestError('Event not found');

        if (event.status !== 'active' && event.status !== 'matching') {
            throw new BadRequestError(`Event is not accepting registrations (status: ${event.status})`);
        }

        if (!input?.attendees?.length) {
            throw new BadRequestError('No attendees provided');
        }

        if (input.attendees.length > 500) {
            throw new BadRequestError('Maximum 500 attendees per bulk import');
        }

        const requiredFields = event.matchingConfig?.requiredFields || [];
        const errors: Array<{ index: number; error: string }> = [];
        let successCount = 0;

        for (let i = 0; i < input.attendees.length; i++) {
            const att = input.attendees[i];
            try {
                // Validate required fields
                const missing = requiredFields.filter((field: string) => att.profile[field] === undefined || att.profile[field] === null);
                if (missing.length > 0) {
                    errors.push({ index: i, error: `Missing required fields: ${missing.join(', ')}` });
                    continue;
                }

                const attendee = await this.attendeeRepository.createAttendee(params.eventId, currentTenant.id!, {
                    name: att.name,
                    profile: att.profile,
                    email: att.email,
                    externalId: att.externalId,
                    preferences: att.preferences,
                });

                // If event is in matching state, immediately add attendee to the pool
                if (event.status === 'matching') {
                    await this.attendeeRepository.updateById(attendee.id, { status: 'in_pool' });
                }

                successCount++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push({ index: i, error: msg });
            }
        }

        logger.info(`Bulk import: ${successCount} registered, ${errors.length} errors for event ${params.eventId}`);

        return {
            data: { successCount, errorCount: errors.length, errors: errors.slice(0, 50) },
            code: HttpStatus.CREATED,
            message: `${successCount} attendees registered successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
        };
    };
}

const bulkRegisterInstance = new BulkRegisterAttendees(new AttendeeRepository());
export default bulkRegisterInstance;
