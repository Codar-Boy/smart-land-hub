const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. HARDENED SECURITY HEADERS
app.use(helmet({
  contentSecurityPolicy: false, 
}));

// 2. BRUTE FORCE PROTECTION
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: "SYSTEM ALERT: Unusual traffic detected from this IP."
});
app.use(limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "SECURITY LOCK: Too many login attempts. Access blocked for 15 mins."
});
app.use('/login', loginLimiter);

// 3. GENERAL MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 4. SECURE SESSION MANAGEMENT
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secure-terminal-key-1985',
  resave: false,
  saveUninitialized: false,
  name: 'SESSION_ID', // Reverted from __Secure- to avoid browser rejection on HTTP
  cookie: { 
    httpOnly: true, // Prevents XSS from reading cookie
    secure: false,  // Set to true if using HTTPS
    sameSite: 'lax', // Changed to lax for better dev compatibility
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// 5. DATA SANITIZATION & LOGGING
app.use((req, res, next) => {
  // Simple logger for security audits
  if (req.method === 'POST') {
    console.log(`[SECURITY LOG] ${new Date().toISOString()} - POST Request to ${req.url} from ${req.ip}`);
  }
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

app.use('/', authRoutes);
app.use('/', serviceRoutes);
app.use('/', expenseRoutes);

// 6. 404 & ERROR HANDLING
app.use((req, res) => {
  res.status(404).send('ERROR 404: RESOURCE NOT FOUND ON THIS TERMINAL');
});

app.listen(PORT, () => {
  console.log(`[SYSTEM READY] SECURE TERMINAL RUNNING ON PORT ${PORT}`);
});
