import api from './api';
import type { AuthUser, UserRole } from './authApi';

export interface AppUser extends AuthUser {
  roleLabel?: string;
  color?: string;
  updatedAt?: string;
}

export interface Section {
  id: string;
  name: string;
  academicYear: string;
  academicYearId?: string | null;
  code: string;
  teacherId?: string | null;
  teacherName?: string | null;
  teacherEmail?: string | null;
  color: string;
  codeCreatedAt?: string;
  codeExpiresAt?: string | null;
  students?: number;
  assignments?: number;
  avgScore?: number;
  createdAt?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  label: string;
  status: 'active' | 'archived';
  description?: string;
  sectionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getUsersAPI = async (params?: { role?: string; search?: string }) => {
  const { data } = await api.get<{ users: AppUser[] }>('/users', { params });
  return data;
};

export const getUserAPI = async (id: string) => {
  const { data } = await api.get<{ user: AppUser }>(`/users/${id}`);
  return data;
};

export const getUserStatsAPI = async () => {
  const { data } = await api.get('/users/stats');
  return data as {
    stats: Record<string, number | string>;
    recentUsers?: AppUser[];
    students?: AppUser[];
    assignments?: { id: string; title: string; levels: number; createdAt: string }[];
    stories?: { id: string; title: string; description?: string; levels: number; theme?: string }[];
    leaderboard?: (AppUser & { rank: number; isMe?: boolean })[];
  };
};

export const getLeaderboardAPI = async (params?: { section?: string; sectionId?: string }) => {
  const { data } = await api.get<{ leaderboard: (AppUser & { rank: number; isMe?: boolean })[] }>(
    '/users/leaderboard',
    { params }
  );
  return data;
};

export const updateUserAPI = async (
  id: string,
  payload: Partial<{ name: string; role: UserRole; section: string; sectionId: string | null; status: string; xp: number; streak: number; avatar: string }>
) => {
  const { data } = await api.patch<{ user: AppUser; message: string }>(`/users/${id}`, payload);
  return data;
};

export const deleteUserAPI = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/users/${id}`);
  return data;
};

export const getSectionsAPI = async (params?: { academicYear?: string; academicYearId?: string }) => {
  const { data } = await api.get<{ sections: Section[] }>('/sections', { params });
  return data;
};

export const getSectionAPI = async (id: string) => {
  const { data } = await api.get<{
    section: Section;
    students: { id: string; name: string; email: string; xp: number; streak: number; status: string }[];
  }>(`/sections/${id}`);
  return data;
};

export const createSectionAPI = async (payload: {
  name: string;
  academicYear?: string;
  academicYearId?: string;
  teacherId?: string | null;
  color?: string;
}) => {
  const { data } = await api.post<{ section: Section; message: string }>('/sections', payload);
  return data;
};

export const updateSectionAPI = async (
  id: string,
  payload: Partial<{
    name: string;
    academicYear: string;
    academicYearId: string;
    teacherId: string | null;
    color: string;
    regenerateCode: boolean;
    codeExpiresAt: string | null;
  }>
) => {
  const { data } = await api.patch<{ section: Section; message: string }>(`/sections/${id}`, payload);
  return data;
};

export const deleteSectionAPI = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/sections/${id}`);
  return data;
};

export const getAcademicYearsAPI = async () => {
  const { data } = await api.get<{ academicYears: AcademicYear[] }>('/academic-years');
  return data;
};

export const getAcademicYearAPI = async (id: string) => {
  const { data } = await api.get<{ academicYear: AcademicYear }>(`/academic-years/${id}`);
  return data;
};

export const createAcademicYearAPI = async (payload: {
  name: string;
  label?: string;
  description?: string;
  status?: 'active' | 'archived';
}) => {
  const { data } = await api.post<{ academicYear: AcademicYear; message: string }>('/academic-years', payload);
  return data;
};

export const updateAcademicYearAPI = async (
  id: string,
  payload: Partial<{ name: string; label: string; description: string; status: 'active' | 'archived' }>
) => {
  const { data } = await api.patch<{ academicYear: AcademicYear; message: string }>(`/academic-years/${id}`, payload);
  return data;
};

export const deleteAcademicYearAPI = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/academic-years/${id}`);
  return data;
};

export const joinSectionAPI = async (code: string) => {
  const { data } = await api.post('/sections/join', { code });
  return data;
};

export const addSectionStudentsAPI = async (sectionId: string, studentIds: string[]) => {
  const { data } = await api.post<{ message: string; added: number }>(
    `/sections/${sectionId}/students`,
    { studentIds }
  );
  return data;
};

export const removeSectionStudentAPI = async (sectionId: string, studentId: string) => {
  const { data } = await api.delete<{ message: string }>(`/sections/${sectionId}/students/${studentId}`);
  return data;
};

export interface SectionAnnouncement {
  id: string;
  sectionId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export const getSectionAnnouncementsAPI = async (sectionId: string) => {
  const { data } = await api.get<{ announcements: SectionAnnouncement[] }>(
    `/sections/${sectionId}/announcements`
  );
  return data;
};

export const createSectionAnnouncementAPI = async (
  sectionId: string,
  payload: { title: string; body: string }
) => {
  const { data } = await api.post<{ announcement: SectionAnnouncement; message: string }>(
    `/sections/${sectionId}/announcements`,
    payload
  );
  return data;
};

export const deleteSectionAnnouncementAPI = async (sectionId: string, announcementId: string) => {
  const { data } = await api.delete<{ message: string }>(
    `/sections/${sectionId}/announcements/${announcementId}`
  );
  return data;
};

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface AwardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  requirement: { type: string; count: number };
}

export const getAwardsAPI = async () => {
  const { data } = await api.get<{
    streak: number;
    lastActivityDate?: string;
    totals: { storiesCompleted: number; stars: number; streak: number; xp: number };
    awards: AwardItem[];
  }>('/users/awards');
  return data;
};

export const getMyProgressAPI = async () => {
  const { data } = await api.get<{
    progress: {
      campaignId: string;
      completed: boolean;
      rewardClaimed?: boolean;
      bonusCoins?: number;
      levels: { levelNumber: number; stars: number; completed: boolean; coins: number }[];
    }[];
  }>('/users/progress');
  return data;
};

export const recordLevelProgressAPI = async (payload: {
  campaignId: string;
  levelNumber: number;
  stars: number;
  coins: number;
  campaignCompleted?: boolean;
}) => {
  const { data } = await api.post('/users/progress', payload);
  return data as {
    message: string;
    xp: number;
    streak: number;
    awards: string[];
    newlyUnlocked: AwardItem[];
    progress: unknown[];
  };
};

export const claimCampaignRewardAPI = async (campaignId: string) => {
  const { data } = await api.post('/users/progress/claim-reward', { campaignId });
  return data as {
    message: string;
    bonusCoins: number;
    progress: {
      campaignId: string;
      completed: boolean;
      rewardClaimed: boolean;
      bonusCoins: number;
      levels: { levelNumber: number; stars: number; completed: boolean; coins: number }[];
    }[];
  };
};

