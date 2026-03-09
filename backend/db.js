const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'customer_feedback',
    password: process.env.PG_PASSWORD || 'postgres',
    port: process.env.PG_PORT || 5432,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database successfully.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit - let pm2 handle recovery if needed
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
