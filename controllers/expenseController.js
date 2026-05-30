const pool = require('../config/db');

exports.getExpenses = async (req, res) => {
  try {
    const expensesResult      = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const settingsResult      = await pool.query('SELECT * FROM settings LIMIT 1');
    const typesResult         = await pool.query('SELECT * FROM service_types ORDER BY name ASC');
    const categoriesResult    = await pool.query('SELECT * FROM expense_categories ORDER BY name ASC');

    // Bug fix: was missing config, expenseCategories, serviceTypes — template would crash
    res.render('dashboard', {
      activeSection:      'expenses',
      expenses:           expensesResult.rows,
      config:             settingsResult.rows[0] || {},
      serviceTypes:       typesResult.rows,
      expenseCategories:  categoriesResult.rows,
      username:           req.session.user,
    });
  } catch (err) {
    console.error('[EXPENSE] getExpenses error:', err.message);
    res.status(500).send('Database Error');
  }
};

exports.addExpense = async (req, res) => {
  const { date, description, amount, category } = req.body;

  // Basic validation
  const parsedAmount = parseFloat(amount);
  if (!date || !description || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).send('Invalid expense data.');
  }

  try {
    await pool.query(
      'INSERT INTO expenses (date, description, amount, category) VALUES ($1, $2, $3, $4)',
      [date, description.trim(), parsedAmount, category]
    );
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error('[EXPENSE] addExpense error:', err.message);
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

    // Bug fix: was missing expenseCategories, serviceTypes, config — template would crash
    const expensesResult    = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const settingsResult    = await pool.query('SELECT * FROM settings LIMIT 1');
    const typesResult       = await pool.query('SELECT * FROM service_types ORDER BY name ASC');
    const categoriesResult  = await pool.query('SELECT * FROM expense_categories ORDER BY name ASC');

    res.render('dashboard', {
      activeSection:      'expenses',
      expenses:           expensesResult.rows,
      config:             settingsResult.rows[0] || {},
      serviceTypes:       typesResult.rows,
      expenseCategories:  categoriesResult.rows,
      editExpense:        result.rows[0],
      username:           req.session.user,
    });
  } catch (err) {
    console.error('[EXPENSE] getEditPage error:', err.message);
    res.status(500).send('Error loading edit page');
  }
};

exports.editExpense = async (req, res) => {
  const { id } = req.params;
  const { date, description, amount, category } = req.body;

  const parsedAmount = parseFloat(amount);
  if (!date || !description || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).send('Invalid expense data.');
  }

  try {
    await pool.query(
      'UPDATE expenses SET date=$1, description=$2, amount=$3, category=$4 WHERE id=$5',
      [date, description.trim(), parsedAmount, category, id]
    );
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error('[EXPENSE] editExpense error:', err.message);
    res.status(500).send('Error updating expense');
  }
};

exports.printExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const expenseResult  = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');

    if (expenseResult.rows.length > 0) {
      res.render('print_expense', {
        e:      expenseResult.rows[0],
        config: settingsResult.rows[0] || {}
      });
    } else {
      res.status(404).send('Expense not found');
    }
  } catch (err) {
    console.error('[EXPENSE] printExpense error:', err.message);
    res.status(500).send('Error loading voucher');
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.redirect('/dashboard/expenses');
  } catch (err) {
    console.error('[EXPENSE] deleteExpense error:', err.message);
    res.status(500).send('Error deleting expense');
  }
};
