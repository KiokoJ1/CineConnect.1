const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/roles', authenticate, authController.getRoles);
router.post('/roles', authenticate, authController.addRole);
router.patch('/active-role', authenticate, authController.switchActiveRole);

module.exports = router;
