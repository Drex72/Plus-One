type Primitive = string | number | boolean | null | undefined | Date;

type PlainObject = Record<string, Primitive>;

type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
    ? U extends Uncapitalize<U>
        ? `${Lowercase<T>}${SnakeCase<U>}`
        : `${Lowercase<T>}_${SnakeCase<Uncapitalize<U>>}`
    : S;

type CamelCase<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<CamelCase<U>>}` : S;

type SnakeCased<T> = {
    [K in keyof T as SnakeCase<string & K>]: T[K];
};

type CamelCased<T> = {
    [K in keyof T as CamelCase<string & K>]: T[K];
};

export type { CamelCase, CamelCased, PlainObject, SnakeCase, SnakeCased };
