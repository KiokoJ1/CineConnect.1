const portfolioService = require('../services/portfolioService');
const { sendSuccess } = require('../utils/apiResponse');

async function getMyPortfolio(req, res, next) {
  try {
    const items = await portfolioService.listForUser(req.user.id);
    return sendSuccess(res, 200, 'Portfolio retrieved.', { items });
  } catch (error) { return next(error); }
}

async function getPortfolioByUserId(req, res, next) {
  try {
    const items = await portfolioService.listForUser(Number(req.params.userId));
    return sendSuccess(res, 200, 'Portfolio retrieved.', { items });
  } catch (error) { return next(error); }
}

async function addItem(req, res, next) {
  try {
    const item = await portfolioService.addItem(req.user.id, req.body);
    return sendSuccess(res, 201, 'Portfolio item added.', { item });
  } catch (error) { return next(error); }
}

async function setFeatured(req, res, next) {
  try {
    const item = await portfolioService.setFeatured(
      req.user.id,
      Number(req.params.itemId),
      req.body.isFeatured,
    );
    return sendSuccess(res, 200, 'Portfolio item updated.', { item });
  } catch (error) { return next(error); }
}

async function deleteItem(req, res, next) {
  try {
    await portfolioService.deleteItem(req.user.id, Number(req.params.itemId));
    return sendSuccess(res, 200, 'Portfolio item removed.');
  } catch (error) { return next(error); }
}

module.exports = { getMyPortfolio, getPortfolioByUserId, addItem, setFeatured, deleteItem };
