// ====================================================
// AUTHENTICATION HANDLER - SUPABASE AUTH
// ====================================================

export class AuthHandler {
  constructor() {
    this.supabaseUrl = 'https://elmdzekyyoepdrnfppn.supabase.co';
    this.storageKey = 'denetron_auth';
  }

  // ====================================================
  // TOKEN MANAGEMENT
  // ====================================================

  async getAuth() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || null;
    } catch (error) {
      console.error('❌ Get auth error:', error);
      return null;
    }
  }

  async saveAuth(authData) {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: {
          accessToken: authData.access_token,
          refreshToken: authData.refresh_token,
          expiresAt: Date.now() + (authData.expires_in * 1000),
          user: authData.user,
        }
      });
      console.log('✅ Auth saved');
      return true;
    } catch (error) {
      console.error('❌ Save auth error:', error);
      return false;
    }
  }

  async clearAuth() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
      console.log('✅ Auth cleared');
      return true;
    } catch (error) {
      console.error('❌ Clear auth error:', error);
      return false;
    }
  }

  // ====================================================
  // TOKEN VALIDATION
  // ====================================================

  async isAuthenticated() {
    const auth = await this.getAuth();
    
    if (!auth) {
      return false;
    }

    // Check if token expired
    if (Date.now() >= auth.expiresAt) {
      console.log('⏰ Token expired');
      
      // Try to refresh
      const refreshed = await this.refreshToken();
      return refreshed;
    }

    return true;
  }

  // ====================================================
  // TOKEN REFRESH
  // ====================================================

  async refreshToken() {
    try {
      const auth = await this.getAuth();
      
      if (!auth || !auth.refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }

      console.log('🔄 Refreshing token...');

      const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: auth.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      await this.saveAuth(data);
      
      console.log('✅ Token refreshed');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      await this.clearAuth();
      return false;
    }
  }

  // ====================================================
  // GET ACCESS TOKEN
  // ====================================================

  async getAccessToken() {
    const auth = await this.getAuth();
    
    if (!auth) {
      return null;
    }

    // Auto refresh if needed (within 5 minutes of expiry)
    if (Date.now() >= (auth.expiresAt - 5 * 60 * 1000)) {
      await this.refreshToken();
      const newAuth = await this.getAuth();
      return newAuth?.accessToken || null;
    }

    return auth.accessToken;
  }

  // ====================================================
  // GET USER INFO
  // ====================================================

  async getUser() {
    const auth = await this.getAuth();
    return auth?.user || null;
  }

  // ====================================================
  // LOGIN URL
  // ====================================================

  getLoginUrl() {
    return 'https://denetron-safety-suite-428441ec-lsxuffzgz-sbenli10s-projects.vercel.app/auth/login?ext=true';
  }
}