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

    console.log("🚀 Popup started");

    this.showLoading();

    // check auth returned from web callback
    await this.checkLocalStorageAuth();

    const isAuth = await this.authHandler.isAuthenticated();

    if (!isAuth) {
      this.showAuthScreen();
      return;
    }

    await this.showMainApp();
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

      const token = await this.authHandler.getAccessToken();
      const user = await this.authHandler.getUser();

      if (!token || !user) throw new Error("No auth");

      const response = await fetch(
        "https://elmdzekyyoepdrnfppn.supabase.co/functions/v1/compliance-check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            action: "GET_DASHBOARD",
            data: {
              orgId: user.id
            }
          })
        }
      );

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();

      this.stats = {
        totalCompanies: data.stats?.totalCompanies || 0,
        warningCount: data.stats?.warningCount || 0,
        criticalCount: data.stats?.criticalCount || 0
      };

      this.updateStatsUI();

    } catch (err) {

      console.error("❌ Load stats error", err);

      this.stats = {
        totalCompanies: 0,
        warningCount: 0,
        criticalCount: 0
      };

      this.updateStatsUI();

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