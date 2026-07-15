const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // M-9 FIX: rejectUnauthorized was false, accepting ANY SSL cert (including self-signed
    // or expired), making the connection vulnerable to MITM attacks in production.
    // Now defaults to true. If you use a self-signed cert in production, set
    // DB_SSL_CA_PATH=/path/to/ca-certificate.crt in your environment instead.
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: true,
        ...(process.env.DB_SSL_CA_PATH ? {
            ca: require('fs').readFileSync(process.env.DB_SSL_CA_PATH).toString()
        } : {})
    } : false
});

module.exports = pool;