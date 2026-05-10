const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', authController.getLoginPage);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
