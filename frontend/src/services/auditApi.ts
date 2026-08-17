import api from './api';

export interface AuditLog {
  id: string;
  actorId?: string | null;
  actorName: string;
  actorEmail: string;
  actorRole: 'admin' | 'teacher' | 'student' | 'system' | 'guest';
  action: string;
  category: string;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
  createdAt: string;
}

export const getAuditLogsAPI = async (params?: {
  role?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { data } = await api.get<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }>('/audit', {
    params: { ...params, _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return data;
};
