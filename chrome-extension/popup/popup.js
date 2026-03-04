// ====================================================
// POPUP CONTROLLER
// ====================================================

import { AuthHandler } from '../auth/auth-handler.js';

class PopupController {

  constructor() {
    this.authHandler = new AuthHandler();

    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0
    };
  }

  // ====================================================
  // INIT
  // ====================================================

  async init() {
    console.log('🚀 Popup initialized');

    // Check configuration
    const isConfigured = await this.checkConfiguration();

    if (!isConfigured) {
      this.showConfigurationRequired();
      return;
    }

    this.authenticated = true;

    // ✅ FORCE STATS RELOAD
    console.log('📊 Requesting fresh stats...');
    await this.loadStats();

    // Setup event listeners
    this.setupEventListeners();

    // Load recent activities
    await this.loadActivities();

    // Update UI
    this.updateUI();

    console.log('✅ Popup ready');
  }

  // ====================================================
  // LOCAL STORAGE AUTH CHECK
  // ====================================================

  async checkLocalStorageAuth() {

    try {

      const tabs = await chrome.tabs.query({
        url: [
          "https://www.denetron.me/*",
          "https://denetron.me/*"
        ]
      });

      for (const tab of tabs) {

        if (!tab.id) continue;

        try {

          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {

              const auth = localStorage.getItem("denetron_extension_auth");

              if (!auth) return null;

              localStorage.removeItem("denetron_extension_auth");

              return JSON.parse(auth);
            }
          });

          const authData = result?.[0]?.result;

          if (authData) {

            console.log("✅ Auth found from web callback");

            await this.authHandler.saveAuth(authData);

            return;

          }

        } catch (err) {

          console.warn("⚠️ Tab access failed", tab.id);

        }

      }

    } catch (err) {

      console.error("❌ LocalStorage auth check error", err);

    }

  }

  // ====================================================
  // SCREENS
  // ====================================================

  showLoading() {

    document.getElementById("loadingScreen").style.display = "flex";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "none";

  }

  showAuthScreen() {

    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("mainApp").style.display = "none";

    document.getElementById("btnLogin")
      .addEventListener("click", () => this.handleLogin());

  }

  async showMainApp() {

    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    this.setupEventListeners();

    await this.loadStats();

    await this.loadActivities();

  }

  // ====================================================
  // LOGIN
  // ====================================================

  handleLogin() {

    const loginUrl = this.authHandler.getLoginUrl();

    console.log("🔐 Opening login", loginUrl);

    chrome.tabs.create({
      url: loginUrl
    });

    // popup kapanır kullanıcı login yapar
    window.close();

  }

  async handleLogout() {

    if (!confirm("Çıkış yapmak istediğinizden emin misiniz?")) return;

    await this.authHandler.clearAuth();

    window.location.reload();

  }

  // ====================================================
  // EVENTS
  // ====================================================

  setupEventListeners() {

    document.getElementById("btnLogout")
      ?.addEventListener("click", () => this.handleLogout());

    document.getElementById("btnSync")
      ?.addEventListener("click", () => this.handleSync());

    document.getElementById("btnOpenDashboard")
      ?.addEventListener("click", () => {

        chrome.tabs.create({
          url: "https://www.denetron.me/isg-bot"
        });

      });

  }

  // ====================================================
  // DATA
  // ====================================================

  async loadStats() {
    try {
      console.log('📊 Loading stats...');

      // ✅ GET_STATS mesajı gönder (background stats'ı yeniler)
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATS',
      });

      if (response && response.success) {
        this.stats = response.stats;
        console.log('✅ Stats loaded:', this.stats);
      } else {
        console.warn('⚠️ Stats not available:', response);
        // Use cached stats
        const cached = await chrome.storage.local.get('stats');
        if (cached.stats) {
          this.stats = cached.stats;
          console.log('📦 Using cached stats');
        }
      }
    } catch (error) {
      console.error('❌ Stats load error:', error);
      // Fallback to default stats
      this.stats = {
        totalCompanies: 0,
        warningCount: 0,
        criticalCount: 0,
      };
    }
  }

  updateStatsUI() {

    document.getElementById("totalCompanies").textContent =
      this.stats.totalCompanies;

    document.getElementById("warningCount").textContent =
      this.stats.warningCount;

    document.getElementById("criticalCount").textContent =
      this.stats.criticalCount;

  }

  async loadActivities() {

    const list = document.getElementById("activityList");

    list.innerHTML =
      '<p class="empty-state">Henüz işlem yok</p>';

  }

  // ====================================================
  // SYNC
  // ====================================================

  async handleSync() {

    const btn = document.getElementById("btnSync");

    const original = btn.innerHTML;

    try {

      btn.disabled = true;
      btn.innerHTML = "⏳ Senkronize ediliyor...";

      await chrome.runtime.sendMessage({
        type: "SYNC_NOW"
      });

      await this.loadStats();

      btn.innerHTML = "✅ Tamamlandı";

      setTimeout(() => {

        btn.innerHTML = original;
        btn.disabled = false;

      }, 2000);

    } catch (err) {

      console.error("❌ Sync error", err);

      btn.innerHTML = "❌ Hata";

      setTimeout(() => {

        btn.innerHTML = original;
        btn.disabled = false;

      }, 2000);

    }

  }

}

// ====================================================
// START
// ====================================================

document.addEventListener("DOMContentLoaded", () => {

  const controller = new PopupController();

  controller.init();

});