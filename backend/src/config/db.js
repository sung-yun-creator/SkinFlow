const mysql = require('mysql2/promise');
require("dotenv").config();

// 여러 요청에서 DB 연결을 재사용하기 위해 connection pool을 만들어 둡니다.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3312,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
