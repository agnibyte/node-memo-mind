const mysql = require("mysql");

const pool = mysql.createPool({
  connectionLimit: 10, // Allow up to 10 connections
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  timezone: "IST",
  multipleStatements: false,
  connectTimeout: 10000, // 10 seconds timeout
});

// Basic connection test (optional)
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Initial DB connection failed:", err);
    process.exit(1);
  } else {
    console.log("MariaDB connected successfully ✅");
    connection.release();
  }
});

// Safe executeQuery using pool
module.exports.executeQuery = function (query, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("DB Query Error:", err);
        return reject(err);
      }
      resolve(results);
    });
  });
};
