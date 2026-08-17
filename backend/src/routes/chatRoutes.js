const express = require('express');
const router = express.Router();
const chat = require('../controllers/chatController');

router.get('/search-users', chat.searchUsers);
router.get('/conversations', chat.getConversations);
router.post('/conversations/dm', chat.getOrCreateDM);
router.post('/conversations/group', chat.createGroup);
router.get('/conversations/:conversationId/messages', chat.getMessages);
router.post('/messages', chat.sendMessage);
router.patch('/messages/:messageId', chat.deleteMessage);
router.delete('/conversations/:conversationId', chat.deleteConversation);

module.exports = router;
