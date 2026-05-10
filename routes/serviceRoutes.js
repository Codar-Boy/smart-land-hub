const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all service routes
router.use(authMiddleware);

router.get('/dashboard', serviceController.getDashboard);
router.get('/dashboard/day-book/print', serviceController.printDayBook);
router.get('/dashboard/profit-loss/print', serviceController.printPL);
router.get('/dashboard/balance-sheet/print', serviceController.printBalanceSheet);
router.get('/dashboard/:section', serviceController.getDashboard);
router.get('/services/edit/:id', serviceController.getEditPage);
router.post('/services/add', serviceController.addService);
router.post('/services/edit/:id', serviceController.editService);
router.post('/services/pay/:id', serviceController.receivePayment);
router.get('/services/delete/:id', serviceController.deleteService);
router.get('/services/print/:id', serviceController.printInvoice);
router.post('/settings/update', serviceController.updateSettings);
router.post('/settings/password', serviceController.updatePassword);
router.post('/settings/service-types/add', serviceController.addServiceType);
router.get('/settings/service-types/delete/:id', serviceController.deleteServiceType);
router.get('/settings/backup', serviceController.exportBackup);

module.exports = router;
