const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Section = require('../models/Section');
const AcademicYear = require('../models/AcademicYear');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { auth } = require('../config/firebase');
const { getOrCreateSettings, publicSettings } = require('../utils/systemSettings');
const { logAudit } = require('../utils/audit');

async function getSettings(req, res) {
  try {
    const settings = await getOrCreateSettings();
    return res.json({ settings: publicSettings(settings) });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ message: 'Could not load settings.' });
  }
}

async function getPublicSettings(req, res) {
  try {
    const settings = await getOrCreateSettings();
    return res.json({
      maintenanceMode: Boolean(settings.maintenanceMode),
      allowRegistration: settings.allowRegistration !== false,
    });
  } catch (err) {
    console.error('getPublicSettings error:', err);
    return res.status(500).json({ message: 'Could not load settings.' });
  }
}

async function updateSettings(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update settings.' });
    }

    const settings = await getOrCreateSettings();
    if (typeof req.body.maintenanceMode === 'boolean') {
      settings.maintenanceMode = req.body.maintenanceMode;
    }
    if (typeof req.body.allowRegistration === 'boolean') {
      settings.allowRegistration = req.body.allowRegistration;
    }
    await settings.save();

    await logAudit({
      req,
      action: 'settings.updated',
      category: 'settings',
      summary: `${req.user.name} updated system settings`,
      meta: {
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
      },
    });

    return res.json({
      message: 'Settings saved.',
      settings: publicSettings(settings),
    });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ message: 'Could not save settings.' });
  }
}

async function clearCache(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can clear cache.' });
    }

    const settings = await getOrCreateSettings();
    settings.cacheClearedAt = new Date();
    await settings.save();

    await logAudit({
      req,
      action: 'settings.cache_cleared',
      category: 'settings',
      summary: `${req.user.name} cleared system cache`,
    });

    return res.json({
      message: 'System cache cleared.',
      settings: publicSettings(settings),
    });
  } catch (err) {
    console.error('clearCache error:', err);
    return res.status(500).json({ message: 'Could not clear cache.' });
  }
}

async function factoryReset(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reset the system.' });
    }

    const { confirmText } = req.body;
    if (confirmText !== 'RESET') {
      return res.status(400).json({ message: 'Type RESET to confirm factory reset.' });
    }

    const keepAdminId = req.user._id;
    const keepFirebaseUid = req.user.firebaseUid;

    const usersToDelete = await User.find({
      _id: { $ne: keepAdminId },
    }).select('_id firebaseUid').lean();

    for (const u of usersToDelete) {
      if (u.firebaseUid && u.firebaseUid !== keepFirebaseUid) {
        await auth.deleteUser(u.firebaseUid).catch(() => {});
      }
    }

    await User.deleteMany({ _id: { $ne: keepAdminId } });
    await Campaign.deleteMany({});
    await Notification.deleteMany({});
    await Announcement.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Section.deleteMany({});
    await AcademicYear.deleteMany({});

    await User.findByIdAndUpdate(keepAdminId, {
      $set: {
        xp: 0,
        streak: 0,
        awards: [],
        storyProgress: [],
        section: 'NA',
        sectionId: null,
      },
    });

    const settings = await getOrCreateSettings();
    settings.maintenanceMode = false;
    settings.allowRegistration = true;
    settings.cacheClearedAt = new Date();
    await settings.save();

    await logAudit({
      req,
      action: 'settings.factory_reset',
      category: 'settings',
      summary: `${req.user.name} performed a factory reset`,
      meta: { deletedUsers: usersToDelete.length },
    });

    return res.json({
      message: 'Factory reset complete. Your admin account was kept.',
      deletedUsers: usersToDelete.length,
      settings: publicSettings(settings),
    });
  } catch (err) {
    console.error('factoryReset error:', err);
    return res.status(500).json({ message: 'Could not reset system.', details: err.message });
  }
}

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings,
  clearCache,
  factoryReset,
};
