import api from './api';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  access: string;
  refresh: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage if they exist
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(credentials: LoginCredentials): Promise<void> {
    try {
      const response = await api.post<AuthResponse>('/api/token/', credentials);
      this.setTokens(response.data.access, response.data.refresh);
    } catch (error) {
      throw new Error('Login failed');
    }
  }

  async register(data: RegisterData): Promise<void> {
    try {
      await api.post('/api/register/', data);
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post<AuthResponse>('/api/token/refresh/', {
        refresh: this.refreshToken
      });
      this.setTokens(response.data.access, this.refreshToken);
    } catch (error) {
      this.logout();
      throw new Error('Token refresh failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/api/users/me/');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get current user');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export const authService = new AuthService();
export default authService; 