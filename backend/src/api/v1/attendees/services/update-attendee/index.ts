import { BadRequestError, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { UpdateAttendeePayload } from '../../interfaces';
import { AttendeeRepository } from '../../repository';

export class UpdateAttendeeById {
    constructor(private readonly attendeeRepository: AttendeeRepository) {}

    handle = async ({ input, params, request }: ControllerArgs<UpdateAttendeePayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const existing = await this.attendeeRepository.findById(params.attendeeId);
        if (!existing) throw new BadRequestError('Attendee not found');

        const updates: Record<string, any> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.email !== undefined) updates.email = input.email;
        if (input.preferences !== undefined) updates.preferences = input.preferences;
        if (input.profile !== undefined) updates.attributes = input.profile;
        if (input.status !== undefined) updates.status = input.status;

        const updated = await this.attendeeRepository.updateById(params.attendeeId, updates);
        const converted = this.attendeeRepository.mapToCamelCase(updated);

        logger.info(`Attendee ${params.attendeeId} updated`);

        return {
            code: HttpStatus.OK,
            message: 'Attendee Updated Successfully',
            data: converted,
        };
    };
}

const updateAttendeeById = new UpdateAttendeeById(new AttendeeRepository());
export default updateAttendeeById;
