import api from './api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export const getNotificationsAPI = async () => {
  const { data } = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');
  return data;
};

export const markNotificationReadAPI = async (id: string) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsReadAPI = async () => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};
