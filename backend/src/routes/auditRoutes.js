const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', requireRole('admin'), listAuditLogs);

module.exports = router;
