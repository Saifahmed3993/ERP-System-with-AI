import { api, apiRequest, clearTokens, setTokens } from '../api/apiClient';
import type { LoginAccountDto, LoginRequest, LoginResponse, UserDto } from '../api/types';

export const authService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', request);
    setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  logout(): void {
    clearTokens();
  },

  async getCurrentUser(): Promise<UserDto> {
    return api.get<UserDto>('/auth/me');
  },

  async getLoginAccounts(): Promise<LoginAccountDto[]> {
    return apiRequest<LoginAccountDto[]>('/auth/login-accounts', { cache: 'no-store' });
  },
};
