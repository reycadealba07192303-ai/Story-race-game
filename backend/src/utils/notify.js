const Notification = require('../models/Notification');

async function createNotification({ userId, title, message, type = 'system', link = null }) {
  if (!userId) return null;
  return Notification.create({ userId, title, message, type, link });
}

async function notifyMany(userIds, payload) {
  if (!userIds?.length) return [];
  const docs = userIds.map((userId) => ({
    userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    link: payload.link || null,
  }));
  return Notification.insertMany(docs);
}

module.exports = { createNotification, notifyMany };
