'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const password = process.env.DEFAULT_SYSTEM_ADMIN_PASSWORD;
        if (!password) {
            throw new Error('SYSADMIN_PASSWORD environment variable is not set');
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        await queryInterface.bulkInsert(
            'sysadmin',
            [
                {
                    id: 'ae5248a5-eeff-4a81-85ad-8ea516aabbf6',
                    name: 'John',
                    email: 'johnnydoe@gmail.com',
                    password: hashedPassword,
                    refreshToken: null,
                    refreshTokenExp: null,
                    role: 'SYSTEM_ADMIN',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {},
        );
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('sysadmin', null);
    },
};
