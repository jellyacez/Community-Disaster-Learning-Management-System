const pool = require('./config/db'); pool.query('SELECT * FROM "user" LIMIT 1').then(r => console.log(r.rows)).catch(e => console.error(e));
