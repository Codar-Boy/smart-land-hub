const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');
const validateId = require('../middleware/validateId');

// All service routes require authentication
router.use(authMiddleware);

// Dashboard sections
router.get('/dashboard',                            serviceController.getDashboard);
router.get('/dashboard/day-book/print',             serviceController.printDayBook);
router.get('/dashboard/profit-loss/print',          serviceController.printPL);
router.get('/dashboard/balance-sheet/print',        serviceController.printBalanceSheet);
router.get('/dashboard/:section',                   serviceController.getDashboard);

// Service CRUD
router.get('/services/edit/:id',                    validateId, serviceController.getEditPage);
router.post('/services/add',                        serviceController.addService);
router.post('/services/edit/:id',                   validateId, serviceController.editService);
router.post('/services/pay/:id',                    validateId, serviceController.receivePayment);
router.post('/services/delete/:id',                 validateId, serviceController.deleteService);  // ✅ POST (was GET)
router.get('/services/print/:id',                   validateId, serviceController.printInvoice);

// Settings
router.post('/settings/update',                     serviceController.updateSettings);
router.post('/settings/password',                   serviceController.updatePassword);
router.post('/settings/username',                   serviceController.updateUsername);

// Service Types
router.post('/settings/service-types/add',          serviceController.addServiceType);
router.post('/settings/service-types/delete/:id',   validateId, serviceController.deleteServiceType);  // ✅ POST (was GET)

// Expense Categories
router.post('/settings/expense-categories/add',     serviceController.addExpenseCategory);
router.post('/settings/expense-categories/delete/:id', validateId, serviceController.deleteExpenseCategory); // ✅ POST (was GET)

// Backup
router.get('/settings/backup',                      serviceController.exportBackup);

module.exports = router;
