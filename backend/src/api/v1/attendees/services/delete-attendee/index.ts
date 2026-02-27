import { BadRequestError, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { DeleteAttendeePayload } from '../../interfaces';
import { AttendeeRepository } from '../../repository';

export class DeleteAttendeeById {
    constructor(private readonly attendeeRepository: AttendeeRepository) {}

    handle = async ({ params, request }: ControllerArgs<DeleteAttendeePayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const existing = await this.attendeeRepository.findById(params.attendeeId);
        if (!existing) throw new BadRequestError('Attendee not found');

        await this.attendeeRepository.updateById(params.attendeeId, {
            deletedAt: new Date().toISOString(),
            status: 'opted_out',
        } as any);

        logger.info(`Attendee ${params.attendeeId} soft-deleted`);

        return {
            code: HttpStatus.OK,
            message: 'Attendee Deleted Successfully',
            data: null,
        };
    };
}

const deleteAttendeeById = new DeleteAttendeeById(new AttendeeRepository());
export default deleteAttendeeById;
