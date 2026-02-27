'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('otp', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },

            authId: {
                type: Sequelize.UUID,
                allowNull: false,

                references: {
                    model: 'auth',
                    key: 'id',
                },
            },

            otp: {
                type: Sequelize.INTEGER({ length: 6 }),
                allowNull: false,
            },

            otpExp: {
                type: Sequelize.DATE,
                allowNull: false,
            },

            receivingMedium: {
                type: Sequelize.ENUM('EMAIL', 'SMS'),
                allowNull: false,
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
        await queryInterface.dropTable('otp');
    },
};
