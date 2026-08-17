import api from './api';

export interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  cacheClearedAt?: string | null;
  updatedAt?: string;
}

export const getSettingsAPI = async () => {
  const { data } = await api.get<{ settings: SystemSettings }>('/settings');
  return data;
};

export const getPublicSettingsAPI = async () => {
  const { data } = await api.get<{ maintenanceMode: boolean; allowRegistration: boolean }>('/settings/public');
  return data;
};

export const updateSettingsAPI = async (payload: Partial<Pick<SystemSettings, 'maintenanceMode' | 'allowRegistration'>>) => {
  const { data } = await api.patch<{ settings: SystemSettings; message: string }>('/settings', payload);
  return data;
};

export const clearCacheAPI = async () => {
  const { data } = await api.post<{ settings: SystemSettings; message: string }>('/settings/clear-cache');
  return data;
};

export const factoryResetAPI = async (confirmText: string) => {
  const { data } = await api.post<{ message: string; deletedUsers: number; settings: SystemSettings }>(
    '/settings/factory-reset',
    { confirmText }
  );
  return data;
};
