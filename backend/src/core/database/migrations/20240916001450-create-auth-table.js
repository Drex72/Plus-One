'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */

        await queryInterface.createTable('auth', {
            id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,

                references: {
                    model: 'user',
                    key: 'id',
                },
            },
            emailAddress: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            phoneNumber: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            providerId: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            provider: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                allowNull: false,
            },
        });

        await queryInterface.sequelize.query(`
            ALTER TABLE auth
            ADD CONSTRAINT check_email_or_phone
            CHECK ("emailAddress" IS NOT NULL OR "phoneNumber" IS NOT NULL);
        `);
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */

        await queryInterface.sequelize.query(`
            ALTER TABLE auth
            DROP CONSTRAINT check_email_or_phone;
        `);

        await queryInterface.dropTable('auth');
    },
};
