const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    // 'dm' = direct message, 'group' = group chat
    type: { type: String, enum: ['dm', 'group'], default: 'dm' },
    name: { type: String, default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sentAt: Date,
    },
    // Track who has "deleted for me" — those users won't see this convo
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
