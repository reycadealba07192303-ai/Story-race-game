const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // e.g. "2026-2027"
    label: { type: String, trim: true, default: '' }, // e.g. "School Year 2026-2027"
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
