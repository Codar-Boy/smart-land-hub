const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ─── STARTUP SECURITY CHECK ───────────────────────────────────────────────────
if (!process.env.SESSION_SECRET) {
  console.error('[SECURITY ERROR] SESSION_SECRET is not set in .env! Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1); // Trust first proxy for secure cookies in production

// ─── 1. HARDENED SECURITY HEADERS (Helmet + CSP) ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],          // inline scripts in dashboard
      scriptSrcAttr: ["'unsafe-inline'"],                  // allows onclick="" and onsubmit=""
      styleSrc:    ["'self'", "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com",
                    "https://fonts.googleapis.com"],
      fontSrc:     ["'self'",
                    "https://cdnjs.cloudflare.com",
                    "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:"],
      formAction:  ["'self'"],                             // forms can only POST to same origin
      frameAncestors: ["'none'"],                          // clickjacking protection
    }
  },
  crossOriginEmbedderPolicy: false,  // allow CDN fonts/icons to load
}));

// ─── 2. BRUTE FORCE PROTECTION ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,              // reduced from 1000
  standardHeaders: true,
  legacyHeaders: false,
  message: "SYSTEM ALERT: Too many requests from this IP. Try again after 15 minutes.",
});
app.use(limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,               // reduced from 20 — 10 login attempts per 15 mins is sufficient
  standardHeaders: true,
  legacyHeaders: false,
  message: "SECURITY LOCK: Too many login attempts. Access blocked for 15 mins.",
});
app.use('/login', loginLimiter);

// ─── 3. GENERAL MIDDLEWARE ────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ─── 4. SECURE SESSION MANAGEMENT ────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'SID',           // non-descriptive cookie name
  cookie: {
    httpOnly: true,       // XSS protection — JS cannot read this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',      // CSRF protection for cross-site POST requests
    maxAge: 8 * 60 * 60 * 1000 // 8 hours (reduced from 24h)
  }
}));

// ─── 5. SECURITY AUDIT LOGGER ────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'DELETE') {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    console.log(`[SECURITY LOG] ${new Date().toISOString()} - ${req.method} ${req.url} from ${ip}`);
  }
  next();
});

// ─── 6. ROUTES ────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

app.use('/', authRoutes);
app.use('/', serviceRoutes);
app.use('/', expenseRoutes);

// ─── 7. GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('ERROR 404: Page not found.');
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).send('An internal error occurred.');
});

app.listen(PORT, () => {
  console.log(`[SYSTEM READY] Server running on port ${PORT}`);
});
