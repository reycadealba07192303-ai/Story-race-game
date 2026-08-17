const mongoose = require('mongoose');

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const SectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, default: '2026-2027' },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
      index: true,
    },
    code: { type: String, required: true, unique: true, uppercase: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    color: { type: String, default: '#6366F1' },
    codeCreatedAt: { type: Date, default: Date.now },
    codeExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SectionSchema.statics.generateJoinCode = generateJoinCode;

module.exports = mongoose.model('Section', SectionSchema);
