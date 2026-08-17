const mongoose = require('mongoose');

const QuizOptionSchema = new mongoose.Schema({
  text: String,
  image: String,
}, { _id: false });

const MatchingPairSchema = new mongoose.Schema({
  left: String,
  right: String,
  leftImage: String,
  rightImage: String,
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  type: { type: String, default: 'multiple_choice' },
  question: String,
  questionImage: String,
  options: [mongoose.Schema.Types.Mixed],
  correctAnswer: String,
  correctBoolean: Boolean,
  pairs: [MatchingPairSchema],
  sequenceItems: [String],
  correctSequence: [String],
  sentence: String,
  wordBank: [String],
  correctWord: String,
});

const LevelSchema = new mongoose.Schema({
  levelNumber: Number,
  storyNode: {
    title: String,
    content: String,
    vocabulary: [{
      word: String,
      definition: String,
      example: String,
    }],
    storyLayout: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  mediaPrompt: String,
  customImage: String,
  quiz: [QuizSchema],
});

const CampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  targetSection: String,
  theme: String,
  moralLesson: String,
  numLevels: Number,
  levels: [LevelSchema],
  published: { type: Boolean, default: false },
  scheduledAt: { type: Date, default: null },
  templateId: { type: String, default: 'space' },
  customTheme: { type: String, default: null },
  storySource: { type: String, enum: ['ai', 'manual'], default: 'ai' },
  coverImage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Campaign', CampaignSchema);
