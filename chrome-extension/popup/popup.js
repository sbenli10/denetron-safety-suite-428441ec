// ====================================================
// POPUP LOGIC - OAUTH AUTHENTICATION
// ====================================================

import { AuthHandler } from '../auth/auth-handler.js';

class PopupController {
  constructor() {
    this.authHandler = new AuthHandler();
    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0,
    };
  }

  async init() {
    console.log('🚀 Popup initialized');

    this.showLoading();

    // Check for auth from localStorage (fallback)
    await this.checkLocalStorageAuth();

    // Check authentication
    const isAuth = await this.authHandler.isAuthenticated();

    if (!isAuth) {
      this.showAuthScreen();
      return;
    }

    // Show main app
    await this.showMainApp();
  }

  // ====================================================
  // CHECK LOCALSTORAGE AUTH (FALLBACK)
  // ====================================================

  // İlgili satırları bul ve değiştir:

  async checkLocalStorageAuth() {
    try {
      // Query all tabs for auth data
      const tabs = await chrome.tabs.query({
        url: ['https://www.denetron.me/*', 'https://denetron.me/*']
      });

      for (const tab of tabs) {
        if (!tab.id) continue;

        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const authData = localStorage.getItem('denetron_extension_auth');
              if (authData) {
                localStorage.removeItem('denetron_extension_auth');
                return JSON.parse(authData);
              }
              return null;
            }
          });

          if (result && result[0]?.result) {
            console.log('✅ Auth found in localStorage');
            await this.authHandler.saveAuth(result[0].result);
            return;
          }
        } catch (err) {
          console.warn('Could not access tab:', tab.id);
        }
      }
    } catch (error) {
      console.error('❌ LocalStorage check error:', error);
    }
  }

  // ...

  setupEventListeners() {
    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // Sync
    document.getElementById('btnSync')?.addEventListener('click', () => {
      this.handleSync();
    });

    // Open Dashboard
    document.getElementById('btnOpenDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://www.denetron.me/isg-bot'
      });
    });
  }

  // ====================================================
  // SCREEN MANAGEMENT
  // ====================================================

  showLoading() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'none';
  }

  showAuthScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';

    // Setup login button
    document.getElementById('btnLogin').addEventListener('click', () => {
      this.handleLogin();
    });
  }

  async showMainApp() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    // Setup event listeners
    this.setupEventListeners();

    // Load data
    await this.loadStats();
    await this.loadActivities();
  }

  // ====================================================
  // AUTHENTICATION
  // ====================================================

  handleLogin() {
    const loginUrl = this.authHandler.getLoginUrl();
    chrome.tabs.create({ url: loginUrl });
    
    // Listen for auth callback
    this.listenForAuth();
    
    // Close popup after opening login (user will reopen after login)
    setTimeout(() => window.close(), 500);
  }

  listenForAuth() {
    // Listen for messages from web app
    const messageListener = async (message, sender, sendResponse) => {
      if (message.type === 'DENETRON_AUTH_SUCCESS') {
        console.log('✅ Auth success received');
        
        // Save auth data
        await this.authHandler.saveAuth(message.data);
        
        // Reload popup
        window.location.reload();
        
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Auto-remove listener after 5 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
    }, 5 * 60 * 1000);
  }

  async handleLogout() {
    if (!confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      return;
    }

    await this.authHandler.clearAuth();
    window.location.reload();
  }

  // ====================================================
  // EVENT LISTENERS
  // ====================================================

  setupEventListeners() {
    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // Sync
    document.getElementById('btnSync')?.addEventListener('click', () => {
      this.handleSync();
    });

    // Open Dashboard
    document.getElementById('btnOpenDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://denetron-safety-suite-428441ec-lsxuffzgz-sbenli10s-projects.vercel.app/isg-bot'
      });
    });
  }

  // ====================================================
  // DATA LOADING
  // ====================================================

  async loadStats() {
    try {
      const token = await this.authHandler.getAccessToken();
      const user = await this.authHandler.getUser();

      if (!token || !user) {
        throw new Error('No auth token');
      }

      // Call Supabase function
      const response = await fetch(
        `https://elmdzekyyoepdrnfppn.supabase.co/functions/v1/compliance-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'GET_DASHBOARD',
            data: {
              orgId: user.id,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();

      this.stats = {
        totalCompanies: data.stats?.totalCompanies || 0,
        warningCount: data.stats?.warningCount || 0,
        criticalCount: data.stats?.criticalCount || 0,
      };

      this.updateStatsUI();
    } catch (error) {
      console.error('❌ Load stats error:', error);
      this.stats = { totalCompanies: 0, warningCount: 0, criticalCount: 0 };
      this.updateStatsUI();
    }
  }

  updateStatsUI() {
    document.getElementById('totalCompanies').textContent = this.stats.totalCompanies;
    document.getElementById('warningCount').textContent = this.stats.warningCount;
    document.getElementById('criticalCount').textContent = this.stats.criticalCount;
  }

  async loadActivities() {
    // TODO: Load recent activities from storage
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '<p class="empty-state">Henüz işlem yok</p>';
  }

  // ====================================================
  // ACTIONS
  // ====================================================

  async handleSync() {
    const btn = document.getElementById('btnSync');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Senkronize ediliyor...';

      // Send sync message to background
      await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });

      // Reload stats
      await this.loadStats();

      btn.innerHTML = '✅ Tamamlandı!';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('❌ Sync error:', error);
      btn.innerHTML = '❌ Hata!';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
  }
}

// ====================================================
// INITIALIZE
// ====================================================

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});