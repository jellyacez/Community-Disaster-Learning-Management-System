const pool = require('./config/db'); pool.query('SELECT email, role FROM "user" WHERE role='system_admin'').then(r => console.log(r.rows)).catch(e => console.error(e));
