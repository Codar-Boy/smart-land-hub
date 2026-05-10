//const { Pool } = require('pg');
//require('dotenv').config();

//const pool = new Pool({
//  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
//  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//});

//module.exports = pool;
const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DB_URL;

console.log("DATABASE URL EXISTS:", !!connectionString);

const pool = new Pool({
  connectionString,

  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;