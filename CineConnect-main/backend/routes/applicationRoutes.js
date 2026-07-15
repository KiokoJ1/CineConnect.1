const express = require('express');
const applicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/mine', authenticate, applicationController.listMyApplications);
router.post('/projects/:projectId', authenticate, applicationController.applyToProject);
router.get('/projects/:projectId', authenticate, applicationController.listProjectApplications);
router.patch('/:applicationId/status', authenticate, applicationController.updateApplicationStatus);

module.exports = router;
