const express = require('express');
const {
  listUsers,
  getUser,
  getStats,
  getLeaderboard,
  updateUser,
  deleteUser,
  getAwards,
  getMyProgress,
  recordLevelProgress,
  claimCampaignReward,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', getStats);
router.get('/leaderboard', getLeaderboard);
router.get('/awards', getAwards);
router.get('/progress', getMyProgress);
router.post('/progress', recordLevelProgress);
router.post('/progress/claim-reward', claimCampaignReward);
router.get('/', requireRole('admin', 'teacher'), listUsers);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
