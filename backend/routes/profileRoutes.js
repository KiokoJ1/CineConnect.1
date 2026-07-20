const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/freelancers', authenticate, profileController.listFreelancers);
router.get('/me', authenticate, profileController.getMyProfile);
router.post('/me', authenticate, profileController.upsertMyProfile);
router.put('/me', authenticate, profileController.upsertMyProfile);
router.get('/:userId/stats', authenticate, profileController.getProfileStats);
router.get('/:userId', authenticate, profileController.getProfileByUserId);

module.exports = router;
