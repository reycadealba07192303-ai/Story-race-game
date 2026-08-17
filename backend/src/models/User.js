const mongoose = require('mongoose');

const LevelProgressSchema = new mongoose.Schema(
  {
    levelNumber: Number,
    stars: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    coins: { type: Number, default: 0 },
  },
  { _id: false }
);

const StoryProgressSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    levels: [LevelProgressSchema],
    completed: { type: Boolean, default: false },
    rewardClaimed: { type: Boolean, default: false },
    bonusCoins: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      required: true,
      default: 'student',
    },
    avatar: { type: String, default: '' },
    section: { type: String, default: 'NA' },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    awards: { type: [String], default: [] },
    storyProgress: { type: [StoryProgressSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'pending', 'disabled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
