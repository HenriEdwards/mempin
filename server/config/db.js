const mysql = require('mysql2/promise');

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DB_POOL_SIZE,
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 3306,
  user: DB_USER || 'root',
  password: DB_PASSWORD || 'justlogin',
  database: DB_NAME || 'mempin',
  waitForConnections: true,
  connectionLimit: Number(DB_POOL_SIZE) || 10,
  namedPlaceholders: true,
  timezone: 'Z',
});

module.exports = pool;