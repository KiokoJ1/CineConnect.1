const messageService = require('../services/messageService');
const messageModel = require('../models/messageModel');
const { sendSuccess } = require('../utils/apiResponse');

async function sendMessage(req, res, next) {
  try {
    const message = await messageService.sendMessage(req.user, req.body);
    return sendSuccess(res, 201, 'Message sent.', { message });
  } catch (error) {
    return next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const conversations = await messageService.listConversations(req.user);
    return sendSuccess(res, 200, 'Conversations retrieved.', { conversations });
  } catch (error) {
    return next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation = await messageService.getConversation(req.user, Number(req.params.otherUserId));
    return sendSuccess(res, 200, 'Conversation retrieved.', { conversation });
  } catch (error) {
    return next(error);
  }
}

async function getThread(req, res, next) {
  try {
    const messages = await messageService.getThread(req.user, Number(req.params.userId));
    return sendSuccess(res, 200, 'Thread retrieved.', { messages });
  } catch (error) {
    return next(error);
  }
}

async function getInbox(req, res, next) {
  try {
    const messages = await messageModel.getInbox(req.user.id);
    return sendSuccess(res, 200, 'Inbox retrieved.', { messages });
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await messageService.getUnreadCount(req.user);
    return sendSuccess(res, 200, 'Unread count.', { count });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendMessage,
  listConversations,
  getConversation,
  getThread,
  getInbox,
  getUnreadCount,
};
