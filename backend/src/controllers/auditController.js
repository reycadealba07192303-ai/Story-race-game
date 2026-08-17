const AuditLog = require('../models/AuditLog');

async function listAuditLogs(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view audit logs.' });
    }

    const {
      role,
      category,
      search,
      limit = 100,
      page = 1,
    } = req.query;

    const filter = {};
    if (role && role !== 'all') filter.actorRole = role;
    if (category && category !== 'all') filter.category = category;

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { summary: { $regex: q, $options: 'i' } },
        { actorName: { $regex: q, $options: 'i' } },
        { actorEmail: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
        { targetName: { $regex: q, $options: 'i' } },
      ];
    }

    const take = Math.min(Number(limit) || 100, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'no-store');
    return res.json({
      logs: logs.map((l) => ({
        id: l._id,
        actorId: l.actorId,
        actorName: l.actorName,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        action: l.action,
        category: l.category,
        summary: l.summary,
        targetType: l.targetType,
        targetId: l.targetId,
        targetName: l.targetName,
        meta: l.meta || {},
        ip: l.ip,
        createdAt: l.createdAt,
      })),
      total,
      page: Number(page) || 1,
      limit: take,
    });
  } catch (err) {
    console.error('listAuditLogs error:', err);
    return res.status(500).json({ message: 'Could not load audit logs.' });
  }
}

module.exports = { listAuditLogs };
