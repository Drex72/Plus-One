'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('userRole', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },

            userId: {
                type: Sequelize.UUID,
                allowNull: false,

                references: {
                    model: 'user',
                    key: 'id',
                },
            },

            roleId: {
                type: Sequelize.UUID,
                allowNull: false,

                references: {
                    model: 'role',
                    key: 'id',
                },
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
        await queryInterface.dropTable('userRole');
    },
};
