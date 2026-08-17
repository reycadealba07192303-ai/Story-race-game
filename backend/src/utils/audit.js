const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit logger. Never throws to callers.
 */
async function logAudit({
  req = null,
  actor = null,
  action,
  category = 'system',
  summary,
  targetType = null,
  targetId = null,
  targetName = null,
  meta = {},
}) {
  try {
    const user = actor || req?.user || null;
    const ip =
      req?.headers?.['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;

    await AuditLog.create({
      actorId: user?._id || user?.id || null,
      actorName: user?.name || (user ? 'Unknown user' : 'Guest'),
      actorEmail: user?.email || '',
      actorRole: user?.role || (user ? 'guest' : 'guest'),
      action,
      category,
      summary,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      targetName,
      meta,
      ip,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
