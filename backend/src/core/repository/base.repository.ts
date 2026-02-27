import { supabaseAdmin } from '@/core';
import { normalizePagination, type PaginationQuery } from '@/core/utils';
import { TableNames } from '../types';

export abstract class BaseRepository<
    TDBRow extends Record<string, unknown>, // optional snake_case DB row
    TRow extends Record<string, unknown> = Record<string, unknown>, // camelCase domain model
> {
    protected abstract table: TableNames;

    /* casing helpers */

    private buildSelect<T extends keyof TDBRow>(fields?: T[]): string {
        return fields?.length ? fields.map((f) => this.toSnakeCase(f as string)).join(', ') : '*';
    }

    private toSnakeCase(field: string): string {
        return field.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    }

    toCamelCase(field: string): string {
        return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }

    mapToSnakeCase(obj: Partial<TRow>): Partial<TDBRow> {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [this.toSnakeCase(k), v])) as Partial<TDBRow>;
    }

    mapToCamelCase = (row: TDBRow): TRow => {
        return Object.fromEntries(Object.entries(row).map(([k, v]) => [this.toCamelCase(k), v])) as TRow;
    };

    /* CRUD */

    async findById(id: string, fields?: (keyof TDBRow)[]): Promise<TDBRow | null> {
        const { data, error } = await supabaseAdmin.from(this.table).select(this.buildSelect(fields)).eq('id', id).maybeSingle();

        if (error) throw error;

        if (!data) return null;

        return data as unknown as TDBRow | null;
    }

    async findMany(options?: {
        pagination?: PaginationQuery;
        filters?: Partial<TDBRow>;
        orderBy?: {
            column: keyof TDBRow;
            ascending?: boolean;
        };
    }): Promise<TDBRow[]> {
        const { pagination, filters, orderBy } = options ?? {};
        const { offset, rangeEnd } = normalizePagination(pagination ?? {});

        let query = supabaseAdmin.from(this.table).select('*');

        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                const col = this.toSnakeCase(key);
                Array.isArray(value) ? (query = query.in(col, value)) : (query = query.eq(col, value));
            }
        }

        if (orderBy) {
            query = query.order(this.toSnakeCase(orderBy.column as string), {
                ascending: orderBy.ascending ?? true,
            });
        }

        const { data, error } = await query.range(offset, rangeEnd);
        if (error) throw error;

        return data as unknown as TDBRow[];
    }

    async updateById(id: string, updates: Partial<TRow>): Promise<TDBRow> {
        const payload = this.mapToSnakeCase(updates);

        const { data, error } = await supabaseAdmin.from(this.table).update(payload).eq('id', id).select('*').single();

        if (error) throw error;

        return data as unknown as TDBRow;
    }
}
