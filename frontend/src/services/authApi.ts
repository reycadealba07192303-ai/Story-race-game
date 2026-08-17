import api from './api';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  section: string;
  sectionId?: string | null;
  xp?: number;
  streak?: number;
  awards?: string[];
  emailVerified?: boolean;
  status?: string;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  refreshToken?: string;
  expiresIn?: string;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  requiresVerification?: boolean;
  email?: string;
}

export const getSignupSectionsAPI = async () => {
  const { data } = await api.get<{ sections: { id: string; name: string; academicYear?: string }[] }>('/auth/sections');
  return data;
};

export const signupAPI = async (payload: {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  section?: string;
  sectionId?: string | null;
}) => {
  const { data } = await api.post<SignupResponse>('/auth/signup', payload);
  return data;
};

export const signinAPI = async (payload: { email: string; password: string }) => {
  const { data } = await api.post<AuthResponse>('/auth/signin', payload);
  return data;
};

export const forgotPasswordAPI = async (email: string) => {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
};

export const resendVerificationAPI = async (email: string, password: string) => {
  const { data } = await api.post<{ message: string; alreadyVerified?: boolean }>(
    '/auth/resend-verification',
    { email, password }
  );
  return data;
};

export const meAPI = async () => {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data;
};

export function getAuthErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; code?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { code?: string } } }).response;
    return response?.data?.code;
  }
  return undefined;
}
