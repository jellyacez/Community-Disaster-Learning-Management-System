const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Verify the server cert in production. For a self-signed cert, point DB_SSL_CA_PATH at its CA instead of turning this off.
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: true,
        ...(process.env.DB_SSL_CA_PATH ? {
            ca: require('fs').readFileSync(process.env.DB_SSL_CA_PATH).toString()
        } : {})
    } : false
});

module.exports = pool;