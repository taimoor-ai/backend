const mysql=require("mysql2")
const dotenv=require("dotenv")
dotenv.config();
const pool = mysql.createPool({
    host:process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS, // replace with your MySQL password
    database: process.env.DB_NAME, // replace with your MySQL database name
  });
  
  const promisePool = pool.promise(); // This allows you to use async/await
  module.exports=promisePool;