const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Search users (for starting new conversations)
exports.searchUsers = async (req, res) => {
  try {
    const { q, exclude } = req.query;
    if (!q || String(q).trim().length < 2) return res.json({ users: [] });
    const regex = new RegExp(q, 'i');
    const filter = { $or: [{ name: regex }, { email: regex }] };
    if (exclude) filter._id = { $ne: exclude };
    const users = await User.find(filter).limit(20).select('name email role section');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const convos = await Conversation.find({
      participants: userId,
      deletedFor: { $ne: userId },
    })
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
      .populate('participants', 'name email role')
      .lean();
    res.set('Cache-Control', 'no-store');
    res.json({ conversations: convos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create or get DM conversation
exports.getOrCreateDM = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;
    if (!userId || !otherUserId) return res.status(400).json({ error: 'Both userIds required' });
    const ids = [userId, otherUserId].sort();

    let convo = await Conversation.findOne({
      type: 'dm',
      participants: { $all: ids, $size: 2 },
    }).populate('participants', 'name email role');

    if (!convo) {
      convo = await Conversation.create({ type: 'dm', participants: ids, createdBy: userId });
      convo = await Conversation.findById(convo._id).populate('participants', 'name email role');
    }

    // Un-delete for this user if previously deleted
    if (convo.deletedFor?.includes(userId)) {
      await Conversation.findByIdAndUpdate(convo._id, { $pull: { deletedFor: userId } });
    }

    res.json({ conversation: convo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create group chat
exports.createGroup = async (req, res) => {
  try {
    const { userId, name, participantIds } = req.body;
    if (!userId || !name || !participantIds?.length) {
      return res.status(400).json({ error: 'userId, name, participantIds required' });
    }
    const allIds = [...new Set([userId, ...participantIds])];
    const convo = await Conversation.create({
      type: 'group',
      name,
      participants: allIds,
      createdBy: userId,
    });
    const populated = await Conversation.findById(convo._id).populate('participants', 'name email role');
    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    const messages = await Message.find({
      conversation: conversationId,
      status: { $ne: 'unsent' },
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email role')
      .lean();

    // Mark unsent messages differently
    const filtered = messages.map((m) => {
      if (m.status === 'deleted_for_everyone') {
        return { ...m, text: 'This message was deleted.' };
      }
      return m;
    });

    res.set('Cache-Control', 'no-store');
    res.json({ messages: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, userId, text } = req.body;
    if (!conversationId || !userId || !text?.trim()) {
      return res.status(400).json({ error: 'conversationId, userId, text required' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      text: text.trim(),
    });

    // Update last message on conversation + clear deletedFor so everyone sees new activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: { text: text.trim(), sender: userId, sentAt: message.createdAt },
      $set: { deletedFor: [] },
    });

    const populated = await Message.findById(message._id).populate('sender', 'name email role');
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete message (3 options)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, mode } = req.body; // mode: 'for_me' | 'for_everyone' | 'unsend'

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (mode === 'for_me') {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
    } else if (mode === 'for_everyone') {
      if (String(msg.sender) !== String(userId)) {
        return res.status(403).json({ error: 'Only sender can delete for everyone' });
      }
      await Message.findByIdAndUpdate(messageId, { status: 'deleted_for_everyone', text: '' });
    } else if (mode === 'unsend') {
      if (String(msg.sender) !== String(userId)) {
        return res.status(403).json({ error: 'Only sender can unsend' });
      }
      await Message.findByIdAndUpdate(messageId, { status: 'unsent' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete conversation for user
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    
    // Hide conversation
    await Conversation.findByIdAndUpdate(conversationId, { $addToSet: { deletedFor: userId } });
    
    // Mark all existing messages as deleted for this user
    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: userId } }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
