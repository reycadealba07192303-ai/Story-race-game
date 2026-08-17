const SystemSettings = require('../models/SystemSettings');

async function getOrCreateSettings() {
  let settings = await SystemSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await SystemSettings.create({ key: 'global' });
  }
  return settings;
}

function publicSettings(s) {
  return {
    maintenanceMode: Boolean(s.maintenanceMode),
    allowRegistration: s.allowRegistration !== false,
    cacheClearedAt: s.cacheClearedAt || null,
    updatedAt: s.updatedAt,
  };
}

module.exports = { getOrCreateSettings, publicSettings };
