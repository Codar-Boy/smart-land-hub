const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// router.get('/dashboard/expenses', expenseController.getExpenses); // Handled by serviceRoutes.js now
router.post('/expenses/add', expenseController.addExpense);
router.get('/expenses/edit/:id', expenseController.getEditPage);
router.post('/expenses/edit/:id', expenseController.editExpense);
router.get('/expenses/delete/:id', expenseController.deleteExpense);
router.get('/expenses/print/:id', expenseController.printExpense);

module.exports = router;
