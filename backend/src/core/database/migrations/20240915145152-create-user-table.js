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

        await queryInterface.createTable('user', {
            id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            fullName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            phoneNumberVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            emailVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            referralCode: {
                type: Sequelize.STRING,
                defaultValue: null,
                allowNull: true,
            },
            isVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },

            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },

            roleId: {
                type: Sequelize.UUID,
                allowNull: false,

                references: {
                    model: 'role',
                    key: 'id',
                },
            },

            acceptedTermsAndConditions: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },

            profileVisits: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
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
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('user', {
            cascade: true,
        });
    },
};
