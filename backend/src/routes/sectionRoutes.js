const express = require('express');
const {
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
} = require('../controllers/sectionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/join', requireRole('student'), joinSection);
router.get('/', listSections);
router.post('/', requireRole('admin'), createSection);
router.get('/:id', getSection);
router.patch('/:id', requireRole('admin', 'teacher'), updateSection);
router.delete('/:id', requireRole('admin'), deleteSection);
router.post('/:id/students', requireRole('admin', 'teacher'), addStudents);
router.delete('/:id/students/:studentId', requireRole('admin', 'teacher'), removeStudent);
router.get('/:id/announcements', listAnnouncements);
router.post('/:id/announcements', requireRole('admin', 'teacher'), createAnnouncement);
router.delete('/:id/announcements/:announcementId', requireRole('admin', 'teacher'), deleteAnnouncement);

module.exports = router;
