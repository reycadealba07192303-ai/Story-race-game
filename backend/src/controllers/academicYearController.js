const AcademicYear = require('../models/AcademicYear');
const Section = require('../models/Section');
const User = require('../models/User');
const { logAudit } = require('../utils/audit');

function publicYear(year, extras = {}) {
  return {
    id: year._id,
    name: year.name,
    label: year.label || `A.Y. ${year.name}`,
    status: year.status || 'active',
    description: year.description || '',
    createdAt: year.createdAt,
    updatedAt: year.updatedAt,
    ...extras,
  };
}

async function listYears(_req, res) {
  try {
    const years = await AcademicYear.find().sort({ name: -1 }).lean();
    const withCounts = await Promise.all(
      years.map(async (year) => {
        const sectionCount = await Section.countDocuments({
          $or: [{ academicYearId: year._id }, { academicYear: year.name }],
        });
        return publicYear(year, { sectionCount });
      })
    );
    return res.json({ academicYears: withCounts });
  } catch (err) {
    console.error('listYears error:', err);
    return res.status(500).json({ message: 'Could not load academic years.' });
  }
}

async function getYear(req, res) {
  try {
    const year = await AcademicYear.findById(req.params.id).lean();
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const sectionCount = await Section.countDocuments({
      $or: [{ academicYearId: year._id }, { academicYear: year.name }],
    });

    return res.json({ academicYear: publicYear(year, { sectionCount }) });
  } catch (err) {
    console.error('getYear error:', err);
    return res.status(500).json({ message: 'Could not load academic year.' });
  }
}

async function createYear(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create academic years.' });
    }

    const { name, label = '', description = '', status = 'active' } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Academic year name is required (e.g. 2026-2027).' });
    }

    const normalized = name.trim();
    const exists = await AcademicYear.findOne({ name: normalized });
    if (exists) {
      return res.status(409).json({ message: 'That academic year already exists.' });
    }

    const year = await AcademicYear.create({
      name: normalized,
      label: label.trim() || `A.Y. ${normalized}`,
      description: description.trim(),
      status: status === 'archived' ? 'archived' : 'active',
    });

    await logAudit({
      req,
      action: 'academic_year.created',
      category: 'academic_year',
      summary: `${req.user.name} created academic year ${year.name}`,
      targetType: 'academic_year',
      targetId: year._id,
      targetName: year.name,
    });

    return res.status(201).json({
      academicYear: publicYear(year, { sectionCount: 0 }),
      message: 'Academic year created.',
    });
  } catch (err) {
    console.error('createYear error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'That academic year already exists.' });
    }
    return res.status(500).json({
      message: err?.message || 'Could not create academic year.',
    });
  }
}

async function updateYear(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update academic years.' });
    }

    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const { name, label, description, status } = req.body;
    const previousName = year.name;

    if (name?.trim() && name.trim() !== year.name) {
      const clash = await AcademicYear.findOne({ name: name.trim(), _id: { $ne: year._id } });
      if (clash) {
        return res.status(409).json({ message: 'That academic year name already exists.' });
      }
      year.name = name.trim();
    }

    if (label !== undefined) year.label = String(label).trim() || `A.Y. ${year.name}`;
    if (description !== undefined) year.description = String(description).trim();
    if (status === 'active' || status === 'archived') year.status = status;

    await year.save();

    // Keep section display string in sync if year name changed
    if (year.name !== previousName) {
      await Section.updateMany(
        { $or: [{ academicYearId: year._id }, { academicYear: previousName }] },
        { $set: { academicYear: year.name, academicYearId: year._id } }
      );
    }

    const sectionCount = await Section.countDocuments({
      $or: [{ academicYearId: year._id }, { academicYear: year.name }],
    });

    await logAudit({
      req,
      action: 'academic_year.updated',
      category: 'academic_year',
      summary: `${req.user.name} updated academic year ${year.name}`,
      targetType: 'academic_year',
      targetId: year._id,
      targetName: year.name,
      meta: { status: year.status },
    });

    return res.json({
      academicYear: publicYear(year, { sectionCount }),
      message: 'Academic year updated.',
    });
  } catch (err) {
    console.error('updateYear error:', err);
    return res.status(500).json({ message: 'Could not update academic year.' });
  }
}

async function deleteYear(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete academic years.' });
    }

    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const sections = await Section.find({
      $or: [{ academicYearId: year._id }, { academicYear: year.name }],
    });

    const sectionIds = sections.map((s) => s._id);
    if (sectionIds.length) {
      await User.updateMany(
        { sectionId: { $in: sectionIds } },
        { $set: { sectionId: null, section: 'NA' } }
      );
      await Section.deleteMany({ _id: { $in: sectionIds } });
    }

    const yearName = year.name;
    const yearId = year._id;

    await year.deleteOne();

    await logAudit({
      req,
      action: 'academic_year.deleted',
      category: 'academic_year',
      summary: `${req.user.name} deleted academic year ${yearName}`,
      targetType: 'academic_year',
      targetId: yearId,
      targetName: yearName,
      meta: { sectionsDeleted: sectionIds.length },
    });

    return res.json({ message: 'Academic year and its sections deleted.' });
  } catch (err) {
    console.error('deleteYear error:', err);
    return res.status(500).json({ message: 'Could not delete academic year.' });
  }
}

module.exports = {
  listYears,
  getYear,
  createYear,
  updateYear,
  deleteYear,
};
