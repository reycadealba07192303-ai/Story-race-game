const Section = require('../models/Section');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const AcademicYear = require('../models/AcademicYear');
const Announcement = require('../models/Announcement');
const { notifyMany } = require('../utils/notify');
const { logAudit } = require('../utils/audit');

function publicSection(section, extras = {}) {
  return {
    id: section._id,
    name: section.name,
    academicYear: section.academicYear,
    academicYearId: section.academicYearId || null,
    code: section.code,
    teacherId: section.teacherId || null,
    color: section.color,
    codeCreatedAt: section.codeCreatedAt || section.createdAt,
    codeExpiresAt: section.codeExpiresAt || null,
    createdAt: section.createdAt,
    ...extras,
  };
}

function normalizeJoinCode(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const fromQuery =
      parsed.searchParams.get('code') ||
      parsed.searchParams.get('joinCode') ||
      parsed.searchParams.get('join_code');
    if (fromQuery) return fromQuery.trim().toUpperCase();

    const pathMatch = parsed.pathname.match(/\/join\/([A-Za-z0-9-]+)/i);
    if (pathMatch?.[1]) return pathMatch[1].trim().toUpperCase();
  } catch {
    const queryMatch = raw.match(/[?&](?:code|joinCode|join_code)=([^&#]+)/i);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
  }

  return raw.replace(/\s/g, '').toUpperCase();
}

function joinCodeExpiryFromNow() {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return expires;
}

async function listSections(req, res) {
  try {
    const { academicYear, academicYearId } = req.query;
    const filter = {};

    if (academicYearId && academicYear) {
      filter.$or = [{ academicYearId }, { academicYear }];
    } else if (academicYearId) {
      filter.academicYearId = academicYearId;
    } else if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (req.user.role === 'teacher') {
      filter.teacherId = req.user._id;
    }

    const sections = await Section.find(filter).sort({ name: 1 }).lean();
    const withCounts = await Promise.all(
      sections.map(async (section) => {
        const students = await User.countDocuments({
          role: 'student',
          $or: [{ sectionId: section._id }, { section: section.name }],
        });
        const assignments = await Campaign.countDocuments({
          published: true,
          $or: [{ targetSection: section.name }, { targetSection: 'All' }],
        });
        const teacher = section.teacherId
          ? await User.findById(section.teacherId).select('name email').lean()
          : null;
        return publicSection(section, {
          students,
          assignments,
          avgScore: 0,
          teacherName: teacher?.name || null,
          teacherEmail: teacher?.email || null,
        });
      })
    );

    return res.json({ sections: withCounts });
  } catch (err) {
    console.error('listSections error:', err);
    return res.status(500).json({ message: 'Could not load sections.' });
  }
}

async function getSection(req, res) {
  try {
    const section = await Section.findById(req.params.id).lean();
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    const students = await User.find({
      role: 'student',
      $or: [{ sectionId: section._id }, { section: section.name }],
    })
      .sort({ name: 1 })
      .lean();

    return res.json({
      section: publicSection(section, { students: students.length }),
      students: students.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        xp: u.xp || 0,
        streak: u.streak || 0,
        status: u.status || 'active',
      })),
    });
  } catch (err) {
    console.error('getSection error:', err);
    return res.status(500).json({ message: 'Could not load section.' });
  }
}

async function createSection(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create sections.' });
    }

    const {
      name,
      academicYear: academicYearName,
      academicYearId = null,
      teacherId = null,
      color = '#6366F1',
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Section name is required.' });
    }

    let yearDoc = null;
    if (academicYearId) {
      yearDoc = await AcademicYear.findById(academicYearId);
      if (!yearDoc) return res.status(404).json({ message: 'Academic year not found.' });
    } else if (academicYearName?.trim()) {
      yearDoc = await AcademicYear.findOne({ name: academicYearName.trim() });
    }

    if (!yearDoc) {
      return res.status(400).json({ message: 'Valid academic year is required.' });
    }

    let code = Section.generateJoinCode();
    while (await Section.findOne({ code })) {
      code = Section.generateJoinCode();
    }

    const codeCreatedAt = new Date();
    const codeExpiresAt = joinCodeExpiryFromNow();

    const section = await Section.create({
      name: name.trim(),
      academicYear: yearDoc.name,
      academicYearId: yearDoc._id,
      code,
      teacherId: teacherId || null,
      color,
      codeCreatedAt,
      codeExpiresAt,
    });

    if (teacherId) {
      await User.findByIdAndUpdate(teacherId, {
        sectionId: section._id,
        section: section.name,
      });
    }

    await logAudit({
      req,
      action: 'section.created',
      category: 'section',
      summary: `${req.user.name} created section ${section.name}`,
      targetType: 'section',
      targetId: section._id,
      targetName: section.name,
    });

    return res.status(201).json({
      section: publicSection(section, { students: 0 }),
      message: 'Section created.',
    });
  } catch (err) {
    console.error('createSection error:', err);
    return res.status(500).json({ message: 'Could not create section.' });
  }
}

async function updateSection(req, res) {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    if (req.user.role === 'teacher' && section.teacherId && String(section.teacherId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { name, academicYear, academicYearId, teacherId, color, regenerateCode } = req.body;

    if (name?.trim() && req.user.role === 'admin') {
      const previousName = section.name;
      section.name = name.trim();
      await User.updateMany(
        { sectionId: section._id },
        { $set: { section: section.name } }
      );
      // keep display name in sync for students using string match
      if (previousName !== section.name) {
        await User.updateMany(
          { section: previousName, role: 'student' },
          { $set: { section: section.name } }
        );
      }
    }

    if (req.user.role === 'admin') {
      if (academicYearId) {
        const yearDoc = await AcademicYear.findById(academicYearId);
        if (!yearDoc) return res.status(404).json({ message: 'Academic year not found.' });
        section.academicYearId = yearDoc._id;
        section.academicYear = yearDoc.name;
      } else if (academicYear?.trim()) {
        section.academicYear = academicYear.trim();
      }
    }

    if (color) section.color = color;
    if (teacherId !== undefined && req.user.role === 'admin') {
      section.teacherId = teacherId || null;
      if (teacherId) {
        await User.findByIdAndUpdate(teacherId, {
          sectionId: section._id,
          section: section.name,
        });
      }
    }

    if (req.body.codeExpiresAt !== undefined) {
      section.codeExpiresAt = req.body.codeExpiresAt ? new Date(req.body.codeExpiresAt) : null;
    }

    if (regenerateCode) {
      let code = Section.generateJoinCode();
      while (await Section.findOne({ code, _id: { $ne: section._id } })) {
        code = Section.generateJoinCode();
      }
      section.code = code;
      section.codeCreatedAt = new Date();
      section.codeExpiresAt = joinCodeExpiryFromNow();
    }

    await section.save();

    await logAudit({
      req,
      action: regenerateCode ? 'section.code_regenerated' : 'section.updated',
      category: 'section',
      summary: regenerateCode
        ? `${req.user.name} regenerated join code for ${section.name}`
        : `${req.user.name} updated section ${section.name}`,
      targetType: 'section',
      targetId: section._id,
      targetName: section.name,
    });

    return res.json({ section: publicSection(section), message: 'Section updated.' });
  } catch (err) {
    console.error('updateSection error:', err);
    return res.status(500).json({ message: 'Could not update section.' });
  }
}

async function deleteSection(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete sections.' });
    }

    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    const sectionName = section.name;
    const sectionId = section._id;

    await User.updateMany(
      { sectionId: section._id },
      { $set: { sectionId: null, section: 'NA' } }
    );
    await section.deleteOne();

    await logAudit({
      req,
      action: 'section.deleted',
      category: 'section',
      summary: `${req.user.name} deleted section ${sectionName}`,
      targetType: 'section',
      targetId: sectionId,
      targetName: sectionName,
    });

    return res.json({ message: 'Section deleted.' });
  } catch (err) {
    console.error('deleteSection error:', err);
    return res.status(500).json({ message: 'Could not delete section.' });
  }
}

async function joinSection(req, res) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join a section with a code.' });
    }

    const code = normalizeJoinCode(req.body.code || req.body.joinCode || req.body.link);
    if (!code) return res.status(400).json({ message: 'Join code is required.' });

    const section = await Section.findOne({ code });
    if (!section) return res.status(404).json({ message: 'Invalid join code.' });

    if (section.codeExpiresAt && new Date() > new Date(section.codeExpiresAt)) {
      return res.status(410).json({ message: 'This join code has expired. Ask your teacher for a new one.' });
    }

    req.user.sectionId = section._id;
    req.user.section = section.name;
    await req.user.save();

    try {
      const { createNotification } = require('../utils/notify');
      await createNotification({
        userId: req.user._id,
        title: `Joined ${section.name}`,
        message: 'You can now read stories assigned to your section.',
        type: 'section',
        link: '/student/section',
      });

      if (section.teacherId) {
        await createNotification({
          userId: section.teacherId,
          title: 'New Student Joined',
          message: `${req.user.name} has joined your section ${section.name}.`,
          type: 'section',
          link: `/teacher/classes/${section._id}`,
        });
      }
    } catch (e) {
      console.error('join notification failed', e.message);
    }

    await logAudit({
      req,
      action: 'section.joined',
      category: 'section',
      summary: `${req.user.name} joined section ${section.name}`,
      targetType: 'section',
      targetId: section._id,
      targetName: section.name,
    });

    return res.json({
      message: `Joined ${section.name}.`,
      section: publicSection(section),
      user: {
        id: req.user._id,
        section: req.user.section,
        sectionId: req.user.sectionId,
      },
    });
  } catch (err) {
    console.error('joinSection error:', err);
    return res.status(500).json({ message: 'Could not join section.' });
  }
}

async function removeStudent(req, res) {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    const canManage =
      req.user.role === 'admin' ||
      (req.user.role === 'teacher' && String(section.teacherId) === String(req.user._id));
    if (!canManage) return res.status(403).json({ message: 'Insufficient permissions' });

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    student.sectionId = null;
    student.section = 'NA';
    await student.save();

    await logAudit({
      req,
      action: 'section.student_removed',
      category: 'section',
      summary: `${req.user.name} removed ${student.name} from ${section.name}`,
      targetType: 'user',
      targetId: student._id,
      targetName: student.name,
      meta: { sectionId: section._id, sectionName: section.name },
    });

    return res.json({ message: 'Student removed from section.' });
  } catch (err) {
    console.error('removeStudent error:', err);
    return res.status(500).json({ message: 'Could not remove student.' });
  }
}

async function addStudents(req, res) {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    if (
      req.user.role === 'teacher' &&
      section.teacherId &&
      String(section.teacherId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one student.' });
    }

    const result = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { $set: { sectionId: section._id, section: section.name } }
    );

    const added = result.modifiedCount || result.matchedCount || 0;
    await logAudit({
      req,
      action: 'section.students_added',
      category: 'section',
      summary: `${req.user.name} added ${added} student(s) to ${section.name}`,
      targetType: 'section',
      targetId: section._id,
      targetName: section.name,
      meta: { count: added },
    });

    return res.json({
      message: `${added} student(s) added to ${section.name}.`,
      added: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error('addStudents error:', err);
    return res.status(500).json({ message: 'Could not add students.' });
  }
}

function publicAnnouncement(a) {
  return {
    id: a._id,
    sectionId: a.sectionId,
    authorId: a.authorId,
    authorName: a.authorName || 'Teacher',
    title: a.title,
    body: a.body,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

async function canAccessSection(req, section) {
  if (!section) return false;
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'teacher') {
    return !section.teacherId || String(section.teacherId) === String(req.user._id);
  }
  if (req.user.role === 'student') {
    return (
      (req.user.sectionId && String(req.user.sectionId) === String(section._id)) ||
      (req.user.section && req.user.section === section.name)
    );
  }
  return false;
}

async function listAnnouncements(req, res) {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });
    if (!(await canAccessSection(req, section))) {
      return res.status(403).json({ message: 'You are not part of this section.' });
    }

    const announcements = await Announcement.find({ sectionId: section._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ announcements: announcements.map(publicAnnouncement) });
  } catch (err) {
    console.error('listAnnouncements error:', err);
    return res.status(500).json({ message: 'Could not load announcements.' });
  }
}

async function createAnnouncement(req, res) {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Only teachers and admins can post announcements.' });
    }
    if (
      req.user.role === 'teacher' &&
      section.teacherId &&
      String(section.teacherId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { title, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    const announcement = await Announcement.create({
      sectionId: section._id,
      authorId: req.user._id,
      authorName: req.user.name,
      title: title.trim(),
      body: body.trim(),
    });

    try {
      const students = await User.find({
        role: 'student',
        $or: [{ sectionId: section._id }, { section: section.name }],
      }).select('_id').lean();
      await notifyMany(
        students.map((s) => s._id),
        {
          title: `Announcement: ${announcement.title}`,
          message: announcement.body.slice(0, 120),
          type: 'section',
          link: '/student/section',
        }
      );
    } catch (notifyErr) {
      console.error('Announcement notify failed:', notifyErr.message);
    }

    await logAudit({
      req,
      action: 'section.announcement_created',
      category: 'section',
      summary: `${req.user.name} posted announcement in ${section.name}`,
      targetType: 'announcement',
      targetId: announcement._id,
      targetName: announcement.title,
      meta: { sectionId: section._id, sectionName: section.name },
    });

    return res.status(201).json({
      message: 'Announcement posted.',
      announcement: publicAnnouncement(announcement),
    });
  } catch (err) {
    console.error('createAnnouncement error:', err);
    return res.status(500).json({ message: 'Could not create announcement.' });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (
      req.user.role === 'teacher' &&
      section.teacherId &&
      String(section.teacherId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const announcement = await Announcement.findOne({
      _id: req.params.announcementId,
      sectionId: section._id,
    });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found.' });

    const title = announcement.title;
    const announcementId = announcement._id;
    await announcement.deleteOne();

    await logAudit({
      req,
      action: 'section.announcement_deleted',
      category: 'section',
      summary: `${req.user.name} deleted announcement "${title}" from ${section.name}`,
      targetType: 'announcement',
      targetId: announcementId,
      targetName: title,
      meta: { sectionId: section._id, sectionName: section.name },
    });

    return res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    console.error('deleteAnnouncement error:', err);
    return res.status(500).json({ message: 'Could not delete announcement.' });
  }
}

module.exports = {
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  joinSection,
  removeStudent,
  addStudents,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
