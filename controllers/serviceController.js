const bcrypt = require('bcrypt');
const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  const section = req.params.section || 'overview';
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  
  let data = { 
    services: [], 
    dueRecords: [],
    expenses: [],
    sales: [],
    costs: [],
    serviceTypes: [],
    targetDate,
    config: {},
    stats: { todayTotalServices: 0, todaySalesCount: 0, todayExpenses: 0, todayExpensesCount: 0, totalPendingDues: 0, monthExpenses: 0, recentServices: [], serviceBreakdown: [], topDues: [] },
    summary: { totalIncome: 0, totalReceived: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0, cashInHand: 0, totalDue: 0 }
  };

  try {
    // Always fetch settings, service types and expense categories for all pages
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    const typesResult = await pool.query('SELECT * FROM service_types ORDER BY name ASC');
    const expenseCategoriesResult = await pool.query('SELECT * FROM expense_categories ORDER BY name ASC');
    data.config = settingsResult.rows[0] || {};
    data.serviceTypes = typesResult.rows;
    data.expenseCategories = expenseCategoriesResult.rows;

    if (section === 'overview') {
      const today = new Date().toISOString().split('T')[0];
      const todaySales = await pool.query('SELECT SUM(total_amount) as total, COUNT(*) as count FROM services WHERE date = $1', [today]);
      const todayExpenses = await pool.query('SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE date = $1', [today]);
      const pendingDues = await pool.query('SELECT SUM(due_amount) as total FROM services');
      const monthExpenses = await pool.query("SELECT SUM(amount) as total FROM expenses WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)");
      const recentServices = await pool.query('SELECT * FROM services ORDER BY created_at DESC LIMIT 5');
      
      // Extra Features logic
      const serviceBreakdown = await pool.query('SELECT service_type, COUNT(*) as count FROM services GROUP BY service_type ORDER BY count DESC LIMIT 5');
      const topDues = await pool.query('SELECT customer_name, due_amount FROM services WHERE due_amount > 0 ORDER BY due_amount DESC LIMIT 5');

      data.stats = {
        todayTotalServices: parseFloat(todaySales.rows[0].total) || 0,
        todaySalesCount: parseInt(todaySales.rows[0].count) || 0,
        todayExpenses: parseFloat(todayExpenses.rows[0].total) || 0,
        todayExpensesCount: parseInt(todayExpenses.rows[0].count) || 0,
        totalPendingDues: parseFloat(pendingDues.rows[0].total) || 0,
        monthExpenses: parseFloat(monthExpenses.rows[0].total) || 0,
        recentServices: recentServices.rows,
        serviceBreakdown: serviceBreakdown.rows,
        topDues: topDues.rows
      };
    } else if (section === 'services') {
      const result = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
      data.services = result.rows;
    } else if (section === 'due-tracking') {
      const result = await pool.query('SELECT * FROM services WHERE due_amount > 0 ORDER BY due_amount DESC');
      data.dueRecords = result.rows;
    } else if (section === 'expenses') {
      const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
      data.expenses = result.rows;
    } else if (section === 'day-book') {
      const salesResult = await pool.query('SELECT * FROM services WHERE date = $1', [targetDate]);
      const costsResult = await pool.query('SELECT * FROM expenses WHERE date = $1', [targetDate]);
      data.sales = salesResult.rows;
      data.costs = costsResult.rows;
    } else if (section === 'settings') {
      // Config is already fetched above
    } else if (section === 'reports') {
      const reportMonth = req.query.month || new Date().getMonth() + 1;
      const reportYear = req.query.year || new Date().getFullYear();
      const customerSearch = req.query.customer || '';

      // 1. Monthly Summary
      const monthlyRes = await pool.query(
        "SELECT SUM(total_amount) as income, SUM(received_amount) as received, SUM(due_amount) as due FROM services WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2",
        [reportMonth, reportYear]
      );
      const monthlyExpRes = await pool.query(
        "SELECT SUM(amount) as total FROM expenses WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2",
        [reportMonth, reportYear]
      );

      // 2. Yearly Summary
      const yearlyRes = await pool.query(
        "SELECT SUM(total_amount) as income, SUM(received_amount) as received, SUM(due_amount) as due FROM services WHERE EXTRACT(YEAR FROM date) = $1",
        [reportYear]
      );
      const yearlyExpRes = await pool.query(
        "SELECT SUM(amount) as total FROM expenses WHERE EXTRACT(YEAR FROM date) = $1",
        [reportYear]
      );

      // 3. Customer Ledger
      let customerLedger = [];
      if (customerSearch) {
        const ledgerRes = await pool.query(
          "SELECT * FROM services WHERE customer_name ILIKE $1 ORDER BY date DESC",
          [`%${customerSearch}%`]
        );
        customerLedger = ledgerRes.rows;
      }

      data.reports = {
        monthly: { income: monthlyRes.rows[0].income || 0, expenses: monthlyExpRes.rows[0].total || 0, due: monthlyRes.rows[0].due || 0 },
        yearly: { income: yearlyRes.rows[0].income || 0, expenses: yearlyExpRes.rows[0].total || 0, due: yearlyRes.rows[0].due || 0 },
        customerLedger,
        filters: { month: reportMonth, year: reportYear, customer: customerSearch }
      };

    } else if (section === 'profit-loss' || section === 'balance-sheet') {
      const serviceSummary = await pool.query('SELECT SUM(total_amount) as total_income, SUM(received_amount) as total_received, SUM(due_amount) as total_due FROM services');
      const expenseSummary = await pool.query('SELECT SUM(amount) as total_expenses FROM expenses');
      const serviceBreakdown = await pool.query('SELECT service_type, SUM(total_amount) as total FROM services GROUP BY service_type ORDER BY total DESC');
      const expenseBreakdown = await pool.query('SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
      
      data.summary = {
        totalIncome: parseFloat(serviceSummary.rows[0].total_income) || 0,
        totalReceived: parseFloat(serviceSummary.rows[0].total_received) || 0,
        totalDue: parseFloat(serviceSummary.rows[0].total_due) || 0,
        totalExpenses: parseFloat(expenseSummary.rows[0].total_expenses) || 0,
        serviceBreakdown: serviceBreakdown.rows,
        expenseBreakdown: expenseBreakdown.rows
      };
      data.summary.grossProfit = data.summary.totalIncome - data.summary.totalExpenses;
      data.summary.netProfit = data.summary.totalReceived - data.summary.totalExpenses;
      data.summary.cashInHand = data.summary.totalReceived - data.summary.totalExpenses;
      data.summary.profitMargin = data.summary.totalIncome > 0 ? (data.summary.grossProfit / data.summary.totalIncome * 100) : 0;
    }
    
    // Pass flash message to view and clear it from session
    const flash = req.session.flash || null;
    if (req.session.flash) delete req.session.flash;

    res.render('dashboard', {
      username: req.session.user,
      activeSection: section,
      flash,
      ...data
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database Error');
  }
};

exports.getEditPage = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.redirect('/dashboard/services');
    }

    // Fetch data for dashboard services section
    const servicesResult = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
    const typesRes = await pool.query('SELECT * FROM service_types ORDER BY name ASC');
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');

    res.render('dashboard', {
      activeSection: 'services',
      services: servicesResult.rows,
      serviceTypes: typesRes.rows,
      config: settingsResult.rows[0] || {},
      editService: result.rows[0],
      username: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit page');
  }
};

exports.addService = async (req, res) => {
  const { date, customer_name, mobile_no, service_type, quantity, rate, discount, received_amount, payment_mode, notes } = req.body;
  try {
    const parsedQuantity = parseInt(quantity, 10) || 1;
    const parsedRate = parseFloat(rate) || 0;
    const parsedDiscount = parseFloat(discount) || 0;
    const parsedReceived = parseFloat(received_amount) || 0;
    const totalAmount = Math.max(0, parsedQuantity * parsedRate - parsedDiscount);
    const dueAmount = Math.max(0, totalAmount - parsedReceived);

    await pool.query(
      'INSERT INTO services (date, customer_name, mobile_no, service_type, quantity, rate, discount, total_amount, received_amount, due_amount, payment_mode, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [date, customer_name, mobile_no, service_type, parsedQuantity, parsedRate, parsedDiscount, totalAmount, parsedReceived, dueAmount, payment_mode, notes]
    );
    res.redirect('/dashboard/services');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding service');
  }
};

exports.editService = async (req, res) => {
  const { id } = req.params;
  const { date, customer_name, mobile_no, service_type, quantity, rate, discount, received_amount, payment_mode, notes } = req.body;
  try {
    const parsedQuantity = parseInt(quantity, 10) || 1;
    const parsedRate = parseFloat(rate) || 0;
    const parsedDiscount = parseFloat(discount) || 0;
    const parsedReceived = parseFloat(received_amount) || 0;
    const totalAmount = Math.max(0, parsedQuantity * parsedRate - parsedDiscount);
    const dueAmount = Math.max(0, totalAmount - parsedReceived);

    await pool.query(
      'UPDATE services SET date=$1, customer_name=$2, mobile_no=$3, service_type=$4, quantity=$5, rate=$6, discount=$7, total_amount=$8, received_amount=$9, due_amount=$10, payment_mode=$11, notes=$12 WHERE id=$13',
      [date, customer_name, mobile_no, service_type, parsedQuantity, parsedRate, parsedDiscount, totalAmount, parsedReceived, dueAmount, payment_mode, notes, id]
    );
    res.redirect('/dashboard/services');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating service');
  }
};

exports.receivePayment = async (req, res) => {
  const { id } = req.params;
  const { pay_amount } = req.body;
  const payment = parseFloat(pay_amount) || 0;

  // Bug fix: reject zero or negative payment
  if (payment <= 0) {
    return res.redirect('/dashboard/due-tracking');
  }

  try {
    const result = await pool.query(
      'SELECT total_amount, received_amount, due_amount FROM services WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.redirect('/dashboard/due-tracking');

    const s = result.rows[0];
    const currentDue    = parseFloat(s.due_amount);
    const currentTotal  = parseFloat(s.total_amount);

    // Bug fix: cap payment at remaining due — prevents overpayment / negative due
    const cappedPayment = Math.min(payment, currentDue);
    const newReceived   = Math.min(parseFloat(s.received_amount) + cappedPayment, currentTotal);
    const newDue        = Math.max(0, currentTotal - newReceived);

    await pool.query(
      'UPDATE services SET received_amount=$1, due_amount=$2 WHERE id=$3',
      [newReceived, newDue, id]
    );

    res.redirect('/dashboard/due-tracking');
  } catch (err) {
    console.error('[PAYMENT] Error:', err.message);
    res.status(500).send('Error processing payment');
  }
};

exports.deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.redirect('/dashboard/services');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting service');
  }
};

exports.printInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    
    if (serviceResult.rows.length > 0) {
      res.render('print_invoice', {
        s: serviceResult.rows[0],
        config: settingsResult.rows[0]
      });
    } else {
      res.status(404).send('Service not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading invoice');
  }
};

exports.printDayBook = async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const salesResult = await pool.query('SELECT * FROM services WHERE date = $1', [targetDate]);
    const costsResult = await pool.query('SELECT * FROM expenses WHERE date = $1', [targetDate]);
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    
    res.render('print_daybook', {
      targetDate,
      sales: salesResult.rows,
      costs: costsResult.rows,
      config: settingsResult.rows[0] || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading day book print');
  }
};

exports.printPL = async (req, res) => {
  try {
    const serviceSummary = await pool.query('SELECT SUM(total_amount) as total_income, SUM(received_amount) as total_received, SUM(due_amount) as total_due FROM services');
    const expenseSummary = await pool.query('SELECT SUM(amount) as total_expenses FROM expenses');
    const serviceBreakdown = await pool.query('SELECT service_type, SUM(total_amount) as total FROM services GROUP BY service_type ORDER BY total DESC');
    const expenseBreakdown = await pool.query('SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');

    const summary = {
      totalIncome: parseFloat(serviceSummary.rows[0].total_income) || 0,
      totalReceived: parseFloat(serviceSummary.rows[0].total_received) || 0,
      totalExpenses: parseFloat(expenseSummary.rows[0].total_expenses) || 0,
      serviceBreakdown: serviceBreakdown.rows,
      expenseBreakdown: expenseBreakdown.rows
    };
    summary.grossProfit = summary.totalIncome - summary.totalExpenses;
    summary.profitMargin = summary.totalIncome > 0 ? (summary.grossProfit / summary.totalIncome * 100) : 0;

    res.render('print_pl', {
      summary,
      config: settingsResult.rows[0] || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading P&L print');
  }
};

exports.printBalanceSheet = async (req, res) => {
  try {
    const serviceSummary = await pool.query('SELECT SUM(total_amount) as total_income, SUM(received_amount) as total_received, SUM(due_amount) as total_due FROM services');
    const expenseSummary = await pool.query('SELECT SUM(amount) as total_expenses FROM expenses');
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');

    const summary = {
      totalReceived: parseFloat(serviceSummary.rows[0].total_received) || 0,
      totalDue: parseFloat(serviceSummary.rows[0].total_due) || 0,
      totalExpenses: parseFloat(expenseSummary.rows[0].total_expenses) || 0,
    };
    summary.cashInHand = summary.totalReceived - summary.totalExpenses;
    summary.totalAssets = summary.cashInHand + summary.totalDue;

    res.render('print_balance_sheet', {
      summary,
      config: settingsResult.rows[0] || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading balance sheet print');
  }
};

exports.updateSettings = async (req, res) => {
  const { business_name, address, mobile, upi_id } = req.body;
  try {
    await pool.query(
      'UPDATE settings SET business_name=$1, address=$2, mobile=$3, upi_id=$4 WHERE id=(SELECT id FROM settings LIMIT 1)',
      [business_name, address, mobile, upi_id]
    );
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating settings');
  }
};
exports.updatePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const username = req.session.user;

  // Input validation
  if (!current_password || !new_password || !confirm_password) {
    req.session.flash = { type: 'error', message: 'All password fields are required.' };
    return res.redirect('/dashboard/settings');
  }

  // Bug fix: minimum password length (was missing)
  if (new_password.length < 8) {
    req.session.flash = { type: 'error', message: 'New password must be at least 8 characters.' };
    return res.redirect('/dashboard/settings');
  }

  if (new_password !== confirm_password) {
    req.session.flash = { type: 'error', message: 'New passwords do not match.' };
    return res.redirect('/dashboard/settings');
  }

  try {
    // Select only needed fields — do not expose full user row
    const userRes = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1',
      [username]
    );
    if (userRes.rows.length === 0) {
      req.session.flash = { type: 'error', message: 'User not found.' };
      return res.redirect('/dashboard/settings');
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      req.session.flash = { type: 'error', message: 'Current password is incorrect.' };
      return res.redirect('/dashboard/settings');
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 12); // cost factor 12
    await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedNewPassword, username]
    );

    // Bug fix: was sending raw <script> — now using session flash + redirect
    req.session.flash = { type: 'success', message: 'Password updated successfully!' };
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error('[PASSWORD] Update error:', err.message);
    res.status(500).send('Error updating password');
  }
};

exports.updateUsername = async (req, res) => {
  const { new_username, current_password } = req.body;
  const username = req.session.user;

  if (!new_username || !current_password) {
    req.session.flash = { type: 'error', message: 'User ID and Password are required.' };
    return res.redirect('/dashboard/settings');
  }

  const trimmedNewUsername = new_username.trim();
  
  if (trimmedNewUsername.length < 3) {
    req.session.flash = { type: 'error', message: 'User ID must be at least 3 characters long.' };
    return res.redirect('/dashboard/settings');
  }

  try {
    const userRes = await pool.query('SELECT id, username, password FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) {
      req.session.flash = { type: 'error', message: 'User not found.' };
      return res.redirect('/dashboard/settings');
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      req.session.flash = { type: 'error', message: 'Current password is incorrect.' };
      return res.redirect('/dashboard/settings');
    }

    // Check if new username is already taken
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [trimmedNewUsername]);
    if (existingUser.rows.length > 0) {
      req.session.flash = { type: 'error', message: 'This User ID is already taken.' };
      return res.redirect('/dashboard/settings');
    }

    await pool.query('UPDATE users SET username = $1 WHERE username = $2', [trimmedNewUsername, username]);
    
    // Update session with new username
    req.session.user = trimmedNewUsername;
    req.session.save(() => {
      req.session.flash = { type: 'success', message: 'User ID updated successfully!' };
      res.redirect('/dashboard/settings');
    });
  } catch (err) {
    console.error('[USERNAME] Update error:', err.message);
    res.status(500).send('Error updating user ID');
  }
};

exports.addServiceType = async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO service_types (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding service type');
  }
};

exports.deleteServiceType = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM service_types WHERE id = $1', [id]);
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting service type');
  }
};

exports.addExpenseCategory = async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO expense_categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding expense category');
  }
};

exports.deleteExpenseCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expense_categories WHERE id = $1', [id]);
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting expense category');
  }
};

exports.exportBackup = async (req, res) => {
  try {
    const services = await pool.query('SELECT * FROM services');
    const expenses = await pool.query('SELECT * FROM expenses');
    const settings = await pool.query('SELECT * FROM settings');
    const types = await pool.query('SELECT * FROM service_types');
    const expenseCategories = await pool.query('SELECT * FROM expense_categories');

    const backupData = {
      timestamp: new Date().toISOString(),
      services: services.rows,
      expenses: expenses.rows,
      settings: settings.rows,
      serviceTypes: types.rows,
      expenseCategories: expenseCategories.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating backup');
  }
};

