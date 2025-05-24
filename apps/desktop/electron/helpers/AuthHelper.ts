/**
 * AuthHelper.ts
 *
 * Manages authentication tokens, refresh mechanisms, and communication with Auth service.
 * Provides secure storage of tokens using electron-store.
 */

import { shell } from 'electron'
import Store from 'electron-store'
import AppState from './AppState'
import fetch from 'node-fetch'

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number; // Timestamp when the access token expires
}

interface User {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  profilePictureUrl?: string;
  subscriptionStatus?: 'free' | 'paid';
}

class AuthHelper {
  private static instance: AuthHelper;
  private store: Store<{
    tokens: AuthTokens | null;
  }>;
  private refreshTokenTimeout: NodeJS.Timeout | null = null;
  private backendUrl: string = process.env.BACKEND_URL || 'http://localhost:4000';
  private webPortalUrl: string = process.env.WEB_PORTAL_URL || 'http://localhost:3000';

  private constructor() {
    // Initialize the secure store
    this.store = new Store({
      name: 'closezly-auth',
      encryptionKey: process.env.ELECTRON_STORE_ENCRYPTION_KEY || 'closezly-secure-key', // Should be more secure in production
      schema: {
        tokens: {
          type: ['object', 'null'],
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresAt: { type: 'number' }
          },
          default: null
        }
      }
    }) as Store<{
      tokens: AuthTokens | null;
    }>;

    // Initialize auth state from stored tokens
    this.initialize();
  }

  public static getInstance(): AuthHelper {
    if (!AuthHelper.instance) {
      AuthHelper.instance = new AuthHelper();
    }
    return AuthHelper.instance;
  }

  private initialize(): void {
    const tokens = this.getTokens();
    if (tokens) {
      // Check if tokens are still valid
      if (tokens.expiresAt && tokens.expiresAt > Date.now()) {
        // Tokens are valid, update AppState
        this.fetchUserProfile(tokens.accessToken);

        // Schedule token refresh
        const timeToExpiry = tokens.expiresAt - Date.now();
        const refreshTime = Math.max(0, timeToExpiry - 300000); // 5 minutes before expiry
        this.scheduleTokenRefresh(refreshTime / 1000);
      } else {
        // Tokens expired, try to refresh
        this.refreshToken();
      }
    }
  }

  public getTokens(): AuthTokens | null {
    return this.store.get('tokens', null);
  }

  public async setTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const expiresAt = Date.now() + expiresIn * 1000;
    this.store.set('tokens', {
      accessToken,
      refreshToken,
      expiresAt
    });

    // Set up token refresh
    this.scheduleTokenRefresh(expiresIn);

    // Immediately set authenticated state (without user profile yet)
    // This ensures the UI updates immediately to show authenticated state
    AppState.setAuthenticated(true);

    // Fetch user profile with the new token and update state when complete
    await this.fetchUserProfile(accessToken);
  }

  public clearTokens(): void {
    this.store.delete('tokens');
    AppState.setAuthenticated(false);

    // Clear any scheduled token refresh
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  public isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return !!tokens && !!tokens.accessToken && !!(tokens.expiresAt && tokens.expiresAt > Date.now());
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    // Schedule refresh for 5 minutes before expiration
    const refreshTime = Math.max(0, expiresIn - 300) * 1000;
    this.refreshTokenTimeout = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  private async refreshToken(): Promise<boolean> {
    const tokens = this.getTokens();
    if (!tokens || !tokens.refreshToken) {
      return false;
    }

    try {
      // Call the backend API to refresh the token
      const response = await fetch(`${this.backendUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: tokens.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json() as { access_token: string, refresh_token: string };
      await this.setTokens(data.access_token, data.refresh_token, 3600); // Assuming 1 hour expiry
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return false;
    }
  }

  private async fetchUserProfile(accessToken: string): Promise<void> {
    try {
      // Call the backend API to get user profile
      const response = await fetch(`${this.backendUrl}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      const user = data.user;

      if (!user) {
        throw new Error('User data not found in response');
      }

      AppState.setAuthenticated(true, {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        username: user.username,
        profilePictureUrl: user.profile_picture_url,
        subscriptionStatus: user.subscription_status || 'free'
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      AppState.setAuthenticated(false);
    }
  }

  public openLoginPage(): void {
    // Open the web portal login page in the default browser
    shell.openExternal(`${this.webPortalUrl}/login?source=desktop`);
  }

  public async handleAuthCallback(url: string): Promise<boolean> {
    try {
      // Parse the URL to extract tokens
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'closezly:') {
        return false;
      }

      // Extract tokens from URL parameters
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      const expiresIn = parseInt(urlObj.searchParams.get('expires_in') || '3600', 10);

      if (!accessToken || !refreshToken) {
        return false;
      }

      // Store tokens and update auth state (now awaits the async operation)
      await this.setTokens(accessToken, refreshToken, expiresIn);
      return true;
    } catch (error) {
      console.error('Error handling auth callback:', error);
      return false;
    }
  }

  /**
   * Refreshes the user profile data from the backend
   * This can be called periodically or when the app regains focus
   */
  public async refreshUserProfile(): Promise<boolean> {
    const tokens = this.getTokens();
    if (!tokens || !tokens.accessToken) {
      return false;
    }

    try {
      await this.fetchUserProfile(tokens.accessToken);
      return true;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return false;
    }
  }
}

export default AuthHelper.getInstance();
