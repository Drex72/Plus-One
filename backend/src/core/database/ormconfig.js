const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    development: {
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST,
        port: 5432,
        pool: {
            min: 2,
            max: 10,
        },
        logging: true,
        define: {
            underscored: true,
        },
        dialect: 'postgres',
        ssl: true,
        dialectOptions: { ssl: { require: true } },
    },

    production: {
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        host: process.env.DATABASE_HOST,
        port: 5432,
        pool: {
            min: 2,
            max: 10,
        },
        logging: false,
        define: {
            underscored: true,
        },
        dialect: 'postgres',
        ssl: true,
        dialectOptions: { ssl: { require: true } },
    },
};
