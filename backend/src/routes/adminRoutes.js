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

router.get('/departments', requireRole('admin', 'manager'), (req, res) =>
  adminController.listDepartments(req, res)
);

router.post('/departments', requireRole('admin'), (req, res) =>
  adminController.createDepartment(req, res)
);

router.delete('/departments/:id', requireRole('admin'), (req, res) =>
  adminController.deleteDepartment(req, res)
);

router.get('/positions', requireRole('admin', 'manager'), (req, res) =>
  adminController.listPositions(req, res)
);

router.post('/positions', requireRole('admin'), (req, res) =>
  adminController.createPosition(req, res)
);

router.delete('/positions/:id', requireRole('admin'), (req, res) =>
  adminController.deletePosition(req, res)
);

// Attendance monitoring (admin/manager)
const CheckInController = require('../controllers/CheckInController');
const checkInController = new CheckInController();

router.get('/attendance/today', requireRole('admin', 'manager'), (req, res) =>
  checkInController.getToday(req, res)
);

router.get('/attendance/history', requireRole('admin', 'manager'), (req, res) =>
  checkInController.getHistory(req, res)
);

// Shift Schedules (recurring weekly)
router.get('/shifts/schedules', requireRole('admin', 'manager'), (req, res) =>
  adminController.listShiftSchedules(req, res)
);
router.post('/shifts/schedules', requireRole('admin'), (req, res) =>
  adminController.createShiftSchedule(req, res)
);
router.delete('/shifts/schedules/:id', requireRole('admin'), (req, res) =>
  adminController.deleteShiftSchedule(req, res)
);

// Shift Overrides (one-off date assignments)
router.get('/shifts/overrides', requireRole('admin', 'manager'), (req, res) =>
  adminController.listShiftOverrides(req, res)
);
router.post('/shifts/overrides', requireRole('admin'), (req, res) =>
  adminController.createShiftOverride(req, res)
);
router.delete('/shifts/overrides/:id', requireRole('admin'), (req, res) =>
  adminController.deleteShiftOverride(req, res)
);

module.exports = router;