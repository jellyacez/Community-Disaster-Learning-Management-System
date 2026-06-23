const pool = require('./config/db'); pool.query('SELECT * FROM "user" LIMIT 1').then(res => { console.log(res.rows); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
