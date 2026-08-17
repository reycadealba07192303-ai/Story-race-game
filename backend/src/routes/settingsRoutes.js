const express = require('express');
const {
  getSettings,
  getPublicSettings,
  updateSettings,
  clearCache,
  factoryReset,
} = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public', getPublicSettings);
router.get('/', requireAuth, requireRole('admin'), getSettings);
router.patch('/', requireAuth, requireRole('admin'), updateSettings);
router.post('/clear-cache', requireAuth, requireRole('admin'), clearCache);
router.post('/factory-reset', requireAuth, requireRole('admin'), factoryReset);

module.exports = router;
