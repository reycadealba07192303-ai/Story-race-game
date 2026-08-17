const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: 'System' },
    actorEmail: { type: String, default: '' },
    actorRole: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'system', 'guest'],
      default: 'system',
      index: true,
    },
    action: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['auth', 'user', 'section', 'academic_year', 'campaign', 'story', 'settings', 'chat', 'progress', 'system'],
      default: 'system',
      index: true,
    },
    summary: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    targetName: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorRole: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
