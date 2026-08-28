import axios from 'axios';

const isDev = import.meta.env.MODE === 'development';
const API_URL = isDev
  ? 'http://localhost:5001/api'
  : (import.meta.env.VITE_API_URL || 'https://story-race-game-w362.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true' // Bypass Localtunnel warning page for API calls
  },
});

const storedToken = localStorage.getItem('srg_auth_token');
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

export const generateCampaignAPI = async (campaignData: {
  title: string;
  description: string;
  section: string;
  numLevels: number;
  templateId?: string;
  customTheme?: string;
}) => {
  try {
    const { section, ...rest } = campaignData;
    const response = await api.post('/campaigns/generate', { ...rest, targetSection: section });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createManualCampaignAPI = async (data: {
  title: string;
  description: string;
  section: string;
  numLevels: number;
  templateId?: string;
  customTheme?: string;
}) => {
  const { section, ...rest } = data;
  const response = await api.post('/campaigns/manual', { ...rest, targetSection: section });
  return response.data;
};

export const saveCampaignAPI = async (campaignData: {
  title: string;
  description: string;
  targetSection: string;
  theme: string;
  moralLesson: string;
  numLevels: number;
  levels: unknown[];
}) => {
  const response = await api.post('/campaigns/save', campaignData);
  return response.data;
};

export const getCampaignsAPI = async () => {
  const response = await api.get('/campaigns');
  return response.data;
};

export const getCampaignByIdAPI = async (id: string) => {
  const response = await api.get(`/campaigns/${id}`);
  return response.data;
};

export const getCampaignProgressAPI = async (id: string) => {
  const response = await api.get(`/campaigns/${id}/progress`);
  return response.data;
};

export const updateCampaignAPI = async (
  id: string,
  payload: {
    levels?: unknown[];
    published?: boolean;
    scheduledAt?: string | null;
    title?: string;
    description?: string;
    targetSection?: string;
    templateId?: string;
    customTheme?: string | null;
    numLevels?: number;
    theme?: string;
    moralLesson?: string;
    coverImage?: string | null;
  }
) => {
  const response = await api.put(`/campaigns/${id}`, payload);
  return response.data;
};

export const deleteCampaignAPI = async (id: string) => {
  const response = await api.delete(`/campaigns/${id}`);
  return response.data;
};

export const getPublishedCampaignsAPI = async () => {
  const response = await api.get('/campaigns/published');
  return response.data;
};

export default api;
