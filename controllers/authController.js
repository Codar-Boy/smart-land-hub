const bcrypt = require('bcrypt');
const pool = require('../config/db');

exports.getLoginPage = async (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
  const config = settingsResult.rows[0] || {};
  res.render('login', { error: null, config });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log(`[AUTH] Login attempt for: ${username}`);
    const result = await pool.query('SELECT * FROM users WHERE username ILIKE $1', [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      console.log(`[AUTH] User found. Password match: ${match}`);
      if (match) {
        req.session.user = user.username;
        return req.session.save(() => {
           res.redirect('/dashboard');
        });
      }
    } else {
      console.log(`[AUTH] User NOT found in database.`);
    }
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    const config = settingsResult.rows[0] || {};
    res.render('login', { error: 'Invalid username or password', config });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};
