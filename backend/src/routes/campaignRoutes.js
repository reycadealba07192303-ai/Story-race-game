const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Get all campaigns
router.get('/', campaignController.getCampaigns);

// Get published campaigns only (for students)
router.get('/published', campaignController.getPublishedCampaigns);

// Get one campaign (for edit)
router.get('/:id', campaignController.getCampaignById);

// Get progress/leaderboard for a campaign
router.get('/:id/progress', campaignController.getCampaignProgress);

// Generate a new campaign with AI
router.post('/generate', campaignController.generateCampaign);

// Create blank manual campaign (teacher builds content)
router.post('/manual', campaignController.createManualCampaign);

// Save a pre-generated campaign
router.post('/save', campaignController.saveCampaign);

// Update an existing campaign (save edits / publish)
router.put('/:id', campaignController.updateCampaign);

// Delete a campaign
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
