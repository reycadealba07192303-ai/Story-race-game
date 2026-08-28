const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Get published campaigns only (for students)
router.get('/published', requireAuth, campaignController.getPublishedCampaigns);

// Get all campaigns (teachers see only their own; admins see all)
router.get('/', requireAuth, campaignController.getCampaigns);

// Get one campaign (for edit)
router.get('/:id', requireAuth, requireRole('admin', 'teacher'), campaignController.getCampaignById);

// Get progress/leaderboard for a campaign
router.get('/:id/progress', requireAuth, requireRole('admin', 'teacher'), campaignController.getCampaignProgress);

// Generate a new campaign with AI
router.post('/generate', requireAuth, requireRole('admin', 'teacher'), campaignController.generateCampaign);

// Create blank manual campaign (teacher builds content)
router.post('/manual', requireAuth, requireRole('admin', 'teacher'), campaignController.createManualCampaign);

// Save a pre-generated campaign
router.post('/save', requireAuth, requireRole('admin', 'teacher'), campaignController.saveCampaign);

// Update an existing campaign (save edits / publish)
router.put('/:id', requireAuth, requireRole('admin', 'teacher'), campaignController.updateCampaign);

// Delete a campaign
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), campaignController.deleteCampaign);

module.exports = router;
