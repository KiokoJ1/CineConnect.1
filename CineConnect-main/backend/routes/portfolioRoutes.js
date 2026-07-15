const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/mine', authenticate, portfolioController.getMyPortfolio);
router.get('/:userId', authenticate, portfolioController.getPortfolioByUserId);
router.post('/', authenticate, portfolioController.addItem);
router.patch('/:itemId/featured', authenticate, portfolioController.setFeatured);
router.delete('/:itemId', authenticate, portfolioController.deleteItem);

module.exports = router;
