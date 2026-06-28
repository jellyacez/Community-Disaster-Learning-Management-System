const pool = require('./config/db'); pool.query('UPDATE "user" SET role='mdrrmo_admin' WHERE email='lipadlagi024@gmail.com' RETURNING *').then(r => { console.log(r.rows); process.exit(0); });
