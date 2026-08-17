const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    cacheClearedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
