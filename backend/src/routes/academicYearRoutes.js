const express = require('express');
const {
  listYears,
  getYear,
  createYear,
  updateYear,
  deleteYear,
} = require('../controllers/academicYearController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listYears);
router.post('/', requireRole('admin'), createYear);
router.get('/:id', getYear);
router.patch('/:id', requireRole('admin'), updateYear);
router.delete('/:id', requireRole('admin'), deleteYear);

module.exports = router;
