const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, projectController.listOpenProjects);
router.post('/', authenticate, projectController.createProject);
router.get('/mine', authenticate, projectController.listMyProjects);
router.get('/:projectId', authenticate, projectController.getProject);
router.put('/:projectId', authenticate, projectController.updateProject);

module.exports = router;
