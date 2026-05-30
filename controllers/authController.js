const bcrypt = require('bcrypt');
const pool = require('../config/db');

exports.getLoginPage = async (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  try {
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    const config = settingsResult.rows[0] || {};
    res.render('login', { error: null, config });
  } catch (err) {
    console.error('[AUTH] Failed to load login page:', err.message);
    res.render('login', { error: null, config: {} });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  // Basic input presence check
  if (!username || !password) {
    return res.render('login', { error: 'Please enter username and password.', config: {} });
  }

  try {
    // Select only necessary fields — never expose full row
    const result = await pool.query(
      'SELECT id, username, password FROM users WHERE username ILIKE $1',
      [username.trim()]
    );

    let loginSuccess = false;

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        loginSuccess = true;
        // ── Session Fixation Fix: regenerate session before setting user ──
        return req.session.regenerate((err) => {
          if (err) {
            console.error('[AUTH] Session regenerate error:', err.message);
            return res.status(500).send('Server Error');
          }
          req.session.user = user.username;
          req.session.save(() => {
            res.redirect('/dashboard');
          });
        });
      }
    }

    // Generic error — do NOT reveal whether username exists or password was wrong
    const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
    const config = settingsResult.rows[0] || {};
    res.render('login', { error: 'Invalid username or password.', config });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH] Session destroy error:', err.message);
    }
    res.clearCookie('SID');
    res.redirect('/');
  });
};
