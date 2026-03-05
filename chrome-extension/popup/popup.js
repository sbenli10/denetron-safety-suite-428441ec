// ====================================================
// POPUP CONTROLLER
// ====================================================

import { AuthHandler } from "../auth/auth-handler.js";

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

  console.log("🚀 Popup initialized");

  this.showLoading();

  const configured = await this.checkConfiguration();

  if (!configured) {

    console.warn("⚠️ Extension not configured");

    this.showAuthScreen();

    return;

  }

  await this.checkLocalStorageAuth();

  const isAuth = await this.authHandler.isAuthenticated();

  if (!isAuth) {

    console.log("🔐 Not authenticated");

    this.showAuthScreen();

    return;

  }

  console.log("✅ Authenticated");

  await this.showMainApp();

}
  // ====================================================
// CONFIG CHECK
// ====================================================

async checkConfiguration() {

  return new Promise((resolve) => {

    chrome.storage.local.get(
      ["supabaseUrl", "supabaseKey", "orgId"],
      (config) => {

        console.log("⚙️ Config read from storage:", config);

        if (!config.supabaseUrl) {
          console.warn("supabaseUrl missing");
          resolve(false);
          return;
        }

        if (!config.supabaseKey) {
          console.warn("supabaseKey missing");
          resolve(false);
          return;
        }

        if (!config.orgId) {
          console.warn("orgId missing");
          resolve(false);
          return;
        }

        resolve(true);

      }
    );

  });

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

            console.log("✅ Auth received from web login");

            await this.authHandler.saveAuth(authData);

            return;

          }

        } catch (err) {

          console.warn("⚠️ Tab access failed:", tab.id);

        }

      }

    } catch (err) {

      console.error("❌ LocalStorage auth check error", err);

    }

  }

  // ====================================================
  // SCREEN MANAGEMENT
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

    document
      .getElementById("btnLogin")
      .addEventListener("click", () => this.handleLogin());

  }

  async showMainApp() {

    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    this.setupEventListeners();

    await this.loadStats();
    await this.loadActivities();

    this.updateStatsUI();

  }

  // ====================================================
  // LOGIN
  // ====================================================

  handleLogin() {

    const loginUrl = this.authHandler.getLoginUrl();

    console.log("🔐 Opening login:", loginUrl);

    chrome.tabs.create({
      url: loginUrl
    });

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

    document
      .getElementById("btnLogout")
      ?.addEventListener("click", () => this.handleLogout());

    document
      .getElementById("btnSync")
      ?.addEventListener("click", () => this.handleSync());

    document
      .getElementById("btnOpenDashboard")
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

  const config = await chrome.storage.local.get([
    "supabaseUrl",
    "supabaseKey",
    "orgId"
  ]);

  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseKey;
  const orgId = config.orgId;

  if (!supabaseUrl || !supabaseKey || !orgId) {
    console.warn("⚠️ Missing config for stats");
    return;
  }

  this.supabaseUrl = supabaseUrl;
  this.supabaseKey = supabaseKey;
  this.orgId = orgId;

  console.log("📊 Loading stats...");
}
  updateStatsUI() {

    document.getElementById("totalCompanies").textContent =
      this.stats.totalCompanies ?? 0;

    document.getElementById("warningCount").textContent =
      this.stats.warningCount ?? 0;

    document.getElementById("criticalCount").textContent =
      this.stats.criticalCount ?? 0;

  }

  async loadActivities() {

    const list = document.getElementById("activityList");

    list.innerHTML = '<p class="empty-state">Henüz işlem yok</p>';

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

      this.updateStatsUI();

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