import { dispatch } from '@/app';
import { BadRequestError, BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { RegisterAttendeePayload } from '../../interfaces';
import { AttendeeRepository } from '../../repository';

export class RegisterAttendeeForEvent extends BaseService {
    constructor(private readonly attendeeRepository: AttendeeRepository) {
        super();
    }

    handle = async ({ input, request, params }: ControllerArgs<RegisterAttendeePayload>) => {
        const currentTenant = request.tenant;

        if (!currentTenant) throw new UnAuthorizedError(`Invalid Tenant!`);

        const [event] = await dispatch('event:get-by-id', { eventId: params.eventId });
        if (!event) throw new BadRequestError('Event not found');

        if (event.status !== 'active' && event.status !== 'matching') {
            throw new BadRequestError(`Event is not accepting registrations (status: ${event.status})`);
        }

        const { profile } = input;

        const eventRequiredFields = event.matchingConfig?.requiredFields || [];

        this.validateRequiredFields(profile, eventRequiredFields);

        const attendee = await this.attendeeRepository.createAttendee(params.eventId, currentTenant?.id!, {
            name: input.name,
            profile,
            email: input.email,
            externalId: input.externalId,
            preferences: input.preferences,
        });

        // If event is in matching state, immediately add attendee to the pool
        if (event.status === 'matching') {
            await this.attendeeRepository.updateById(attendee.id, { status: 'in_pool' });
        }

        logger.info('Attendee Registered Successfully');

        return {
            data: event,
            code: HttpStatus.CREATED,
            message: 'Attendee Registered Successfully',
        };
    };

    private validateRequiredFields<T extends Record<string, any>>(obj: T, requiredFields: string[]) {
        const missing = requiredFields.filter((field) => obj[field] === undefined || obj[field] === null);

        if (missing.length > 0) {
            throw new BadRequestError(`You must add the following fields to your profile to enable matching: ${missing.join(', ')}.`);
        }
    }
}

const registerAttendeeInstance = new RegisterAttendeeForEvent(new AttendeeRepository());
export default registerAttendeeInstance;
