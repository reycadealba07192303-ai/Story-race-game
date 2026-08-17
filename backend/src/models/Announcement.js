const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: '' },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ sectionId: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
