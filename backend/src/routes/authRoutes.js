const express = require('express');
const { signup, signin, forgotPassword, resendVerification, me, listSignupSections } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/forgot-password', forgotPassword);
router.post('/resend-verification', resendVerification);
router.get('/sections', listSignupSections);
router.get('/me', requireAuth, me);

module.exports = router;
