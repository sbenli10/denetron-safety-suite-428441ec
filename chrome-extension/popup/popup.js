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

  // Check configuration
  const isConfigured = await this.checkConfiguration();

  if (!isConfigured) {
    console.warn("⚠️ Extension not configured");
    this.showAuthScreen();
    return;
  }

  console.log("✅ Configuration valid");

  // ✅ Get authenticated user's org_id
  const auth = await chrome.storage.local.get("denetron_auth");
  
  if (auth.denetron_auth && auth.denetron_auth.user) {
    const userId = auth.denetron_auth.user.id;
    console.log("📍 Authenticated user ID:", userId);
    
    // Update orgId in storage if different
    const config = await chrome.storage.local.get("orgId");
    if (config.orgId !== userId) {
      console.log("🔄 Updating orgId to match user ID");
      await chrome.storage.local.set({ orgId: userId });
    }
  }

  await this.showMainApp();
}

async loadStats() {
  if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
    console.error("❌ Missing config for stats");
    return;
  }

  console.log("📊 Loading stats from Supabase...");
  console.log("📍 Using org_id:", this.orgId);

  try {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/isgkatip_companies?org_id=eq.${this.orgId}&select=compliance_status`,
      {
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const companies = await response.json();

    console.log("✅ Companies fetched:", companies.length);

    this.stats = {
      totalCompanies: companies.length,
      warningCount: companies.filter((c) => c.compliance_status === "WARNING")
        .length,
      criticalCount: companies.filter((c) => c.compliance_status === "CRITICAL")
        .length,
    };

    console.log("📊 Stats calculated:", this.stats);

    // Cache stats
    await chrome.storage.local.set({ stats: this.stats });
  } catch (error) {
    console.error("❌ Stats load error:", error);

    // Try to use cached stats
    const cached = await chrome.storage.local.get("stats");
    if (cached.stats) {
      this.stats = cached.stats;
      console.log("📦 Using cached stats:", this.stats);
    }
  }
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