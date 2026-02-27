import type { FileArray } from 'express-fileupload';
import { Tenant } from '~/tenants/interfaces';
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type

        export interface Request {
            file: FileArray | null | undefined;
            tenant?: Partial<Tenant> | null;
        }
    }
}
