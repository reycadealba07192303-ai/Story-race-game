import api from './api';

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  section?: string;
}

export interface ConversationData {
  _id: string;
  type: 'dm' | 'group';
  name?: string | null;
  participants: ChatUser[];
  createdBy?: string;
  lastMessage?: { text: string; sender: string; sentAt: string };
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  conversation: string;
  sender: ChatUser;
  text: string;
  status: string;
  createdAt: string;
}

export const searchChatUsersAPI = async (q: string, exclude?: string) => {
  const { data } = await api.get<{ users: ChatUser[] }>('/chat/search-users', { params: { q, exclude } });
  return data;
};

export const getConversationsAPI = async (userId: string) => {
  const { data } = await api.get<{ conversations: ConversationData[] }>('/chat/conversations', {
    params: { userId, _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return data;
};

export const getOrCreateDmAPI = async (userId: string, otherUserId: string) => {
  const { data } = await api.post<{ conversation: ConversationData }>('/chat/conversations/dm', { userId, otherUserId });
  return data;
};

export const createGroupAPI = async (userId: string, name: string, participantIds: string[]) => {
  const { data } = await api.post<{ conversation: ConversationData }>('/chat/conversations/group', { userId, name, participantIds });
  return data;
};

export const getMessagesAPI = async (conversationId: string, userId: string) => {
  const { data } = await api.get<{ messages: MessageData[] }>(`/chat/conversations/${conversationId}/messages`, {
    params: { userId, _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return data;
};

export const sendMessageAPI = async (conversationId: string, userId: string, text: string) => {
  const { data } = await api.post<{ message: MessageData }>('/chat/messages', { conversationId, userId, text });
  return data;
};

export const deleteMessageAPI = async (messageId: string, userId: string, mode: 'for_me' | 'for_everyone' | 'unsend') => {
  const { data } = await api.patch(`/chat/messages/${messageId}`, { userId, mode });
  return data;
};

export const deleteConversationAPI = async (conversationId: string, userId: string) => {
  const { data } = await api.delete(`/chat/conversations/${conversationId}`, { data: { userId } });
  return data;
};
