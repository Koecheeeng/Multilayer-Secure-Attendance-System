const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const AdminController = require('../controllers/AdminController');

const adminController = new AdminController();

router.use(requireAuth);

router.get('/me', (req, res) => adminController.me(req, res));

router.get('/staff', requireRole('admin', 'manager'), (req, res) =>
  adminController.listStaff(req, res)
);

router.post('/staff', requireRole('admin'), (req, res) =>
  adminController.createStaff(req, res)
);

router.patch('/staff/:id', requireRole('admin'), (req, res) =>
  adminController.updateStaff(req, res)
);

router.delete('/staff/:id', requireRole('admin'), (req, res) =>
  adminController.deleteStaff(req, res)
);

router.get('/absence', requireRole('admin', 'manager'), (req, res) =>
  adminController.listAbsence(req, res)
);

router.post('/absence', requireRole('admin'), (req, res) =>
  adminController.createAbsence(req, res)
);

module.exports = router;