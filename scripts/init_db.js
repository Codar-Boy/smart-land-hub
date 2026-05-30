const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function initDB() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        customer_name VARCHAR(100) NOT NULL,
        mobile_no VARCHAR(15),
        service_type VARCHAR(50),
        total_amount DECIMAL(10, 2) DEFAULT 0,
        received_amount DECIMAL(10, 2) DEFAULT 0,
        due_amount DECIMAL(10, 2) DEFAULT 0,
        payment_mode VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add notes column if not exists
    await pool.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    // Add quantity, rate, discount columns if not exists
    await pool.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1
    `);
    await pool.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS rate DECIMAL(10, 2) DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0
    `);

    // Create expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(100),
        address TEXT,
        mobile VARCHAR(20),
        upi_id VARCHAR(100)
      )
    `);

    // Create service_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE
      )
    `);

    // Seed settings if empty
    const settingsCheck = await pool.query('SELECT * FROM settings');
    if (settingsCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO settings (business_name, address, mobile, upi_id) VALUES ($1, $2, $3, $4)',
        ['My Business', 'Business Address Here', '9876543210', 'yourname@upi']
      );
    }

    // Create expense_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      )
    `);

    // Seed service_types if empty
    const typesCheck = await pool.query('SELECT * FROM service_types');
    if (typesCheck.rows.length === 0) {
      const defaultTypes = ['Deed Drafting', 'Agreement', 'Plot Map', 'Plot Survey', 'Affidavit', 'Tax e-filling', 'GST Returns'];
      for (const type of defaultTypes) {
        await pool.query('INSERT INTO service_types (name) VALUES ($1) ON CONFLICT DO NOTHING', [type]);
      }
    }

    // Seed expense categories if empty
    const expenseCategoriesCheck = await pool.query('SELECT * FROM expense_categories');
    if (expenseCategoriesCheck.rows.length === 0) {
      const defaultExpenseCategories = ['Utilities', 'Rent', 'Salary', 'Others'];
      for (const category of defaultExpenseCategories) {
        await pool.query('INSERT INTO expense_categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [category]);
      }
    }

    // Check if admin user exists
    const res = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (res.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', hashedPassword]);
      console.log('\n========================================================');
      console.log('⚠️  WARNING: Default user created: admin / password123');
      console.log('⚠️  ACTION REQUIRED: Please login and change this password immediately!');
      console.log('========================================================\n');
    } else {
      console.log('Admin user already exists');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initDB();
