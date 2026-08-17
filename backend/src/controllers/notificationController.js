const Notification = require('../models/Notification');

async function listNotifications(req, res) {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });

    return res.json({
      notifications: notifications.map((n) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (err) {
    console.error('listNotifications error:', err);
    return res.status(500).json({ message: 'Could not load notifications.' });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const notif = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification not found.' });
    notif.read = true;
    await notif.save();
    return res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ message: 'Could not update notification.' });
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ message: 'Could not update notifications.' });
  }
}

module.exports = { listNotifications, markRead, markAllRead };
