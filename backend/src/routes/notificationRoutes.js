const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { listNotifications, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
