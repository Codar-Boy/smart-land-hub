const pool = require('../config/db');

exports.getExpenses = async (req, res) => {
  const section = req.params.section || 'overview';
  let data = { 
    expenses: [],
    username: req.session.user,
    activeSection: 'expenses',
    upiId: process.env.UPI_ID || 'yourname@upi',
    businessName: process.env.BUSINESS_NAME || 'My Business'
  };

  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    data.expenses = result.rows;
    res.render('dashboard', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database Error');
  }
};

exports.addExpense = async (req, res) => {
  const { date, description, amount, category } = req.body;
  try {
    await pool.query(
      'INSERT INTO expenses (date, description, amount, category) VALUES ($1, $2, $3, $4)',
      [date, description, amount, category]
    );
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding expense');
  }
};

exports.getEditPage = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.redirect('/dashboard/expenses');
    }

    // Fetch data for dashboard expenses section
    const expensesResult = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');

    res.render('dashboard', {
      activeSection: 'expenses',
      expenses: expensesResult.rows,
      config: settingsResult.rows[0] || {},
      editExpense: result.rows[0],
      username: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit page');
  }
};

exports.editExpense = async (req, res) => {
  const { id } = req.params;
  const { date, description, amount, category } = req.body;
  try {
    await pool.query(
      'UPDATE expenses SET date=$1, description=$2, amount=$3, category=$4 WHERE id=$5',
      [date, description, amount, category, id]
    );
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating expense');
  }
};

exports.printExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const expenseResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    
    if (expenseResult.rows.length > 0) {
      res.render('print_expense', {
        e: expenseResult.rows[0],
        config: settingsResult.rows[0]
      });
    } else {
      res.status(404).send('Expense not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading voucher');
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting expense');
  }
};
