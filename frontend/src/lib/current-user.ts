import 'server-only';
import { cache } from 'react';
import { apiFetch } from './api';
import type { User } from './types';

/** One /auth/me call per request, shared by the layout and pages. */
export const getCurrentUser = cache(() => apiFetch<User>('/auth/me'));
