const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');
const validateId = require('../middleware/validateId');

// All expense routes require authentication
router.use(authMiddleware);

router.post('/expenses/add',            expenseController.addExpense);
router.get('/expenses/edit/:id',        validateId, expenseController.getEditPage);
router.post('/expenses/edit/:id',       validateId, expenseController.editExpense);
router.post('/expenses/delete/:id',     validateId, expenseController.deleteExpense);  // ✅ POST (was GET)
router.get('/expenses/print/:id',       validateId, expenseController.printExpense);

module.exports = router;
