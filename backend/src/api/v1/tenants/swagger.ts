export const tenantSwaggerSpec = {
    tags: [{ name: 'Tenants', description: 'Tenant registration and management' }],
    paths: {
        '/tenants': {
            post: {
                tags: ['Tenants'],
                summary: 'Create a new tenant',
                description:
                    "Register a new tenant. Returns the tenant record including the `api_key` — save this, it's your auth credential for all other endpoints.",
                operationId: 'createTenant',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateTenantInput' },
                            example: {
                                name: 'Drexler Entertainment',
                                webhook_endpoint: 'https://example.com/webhooks/matches',
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Tenant created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TenantCreated' },
                            },
                        },
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },

        '/tenants/me': {
            get: {
                tags: ['Tenants'],
                summary: 'Get current tenant',
                description: 'Retrieve the tenant associated with the provided API key.',
                operationId: 'getCurrentTenant',
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Current tenant details',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Tenant' },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
            patch: {
                tags: ['Tenants'],
                summary: 'Update current tenant',
                description: "Update the authenticated tenant's name, webhook endpoint, or metadata.",
                operationId: 'updateCurrentTenant',
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateTenantInput' },
                            example: {
                                name: 'Drexler Events Inc.',
                                webhook_endpoint: 'https://new-url.com/webhooks',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Tenant updated',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Tenant' },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },
    },

    components: {
        schemas: {
            CreateTenantInput: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: {
                        type: 'string',
                        description: 'Tenant organization name',
                        example: 'Acme Corp',
                    },
                    webhookEndpoint: {
                        type: 'string',
                        format: 'uri',
                        description: 'URL to receive match webhook notifications',
                        example: 'https://example.com/webhooks/matches',
                    },
                    metadata: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Arbitrary metadata',
                    },
                },
            },

            TenantCreated: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    apiKey: {
                        type: 'string',
                        description: 'Your API key — save this for authenticating future requests',
                        example: 'mt_a1b2c3d4e5f6...',
                    },
                    webhookEndpoint: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },

            Tenant: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    webhookEndpoint: { type: 'string', nullable: true },
                    metadata: { type: 'object', additionalProperties: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },

            UpdateTenantInput: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    webhookEndpoint: { type: 'string', format: 'uri' },
                    metadata: { type: 'object', additionalProperties: true },
                },
            },
        },
    },
};
