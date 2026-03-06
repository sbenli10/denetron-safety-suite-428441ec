// chrome-extension/popup/popup.js

// ====================================================
// POPUP CONTROLLER - TAM DÜZELTİLMİŞ (İSG-KATİP Gelişmiş)
// ====================================================

import { AuthHandler } from "../auth/auth-handler.js";

class PopupController {
  constructor() {
    this.authHandler = new AuthHandler();
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.orgId = null;
    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0,
    };
  }

  // ====================================================
  // INIT
  // ====================================================

  async init() {
    console.log("🚀 Popup initialized");

    this.showLoading();

    // ✅ First: Load config
    const configLoaded = await this.loadConfig();

    if (!configLoaded) {
      console.warn("⚠️ Extension not configured");
      this.showAuthScreen();
      return;
    }

    console.log("✅ Configuration loaded");

    // ✅ Second: Check auth
    await this.checkLocalStorageAuth();

    const isAuth = await this.authHandler.isAuthenticated();

    if (!isAuth) {
      console.log("🔐 Not authenticated");
      this.showAuthScreen();
      return;
    }

    console.log("✅ Authenticated");

    // ✅ Third: Sync org_id with user_id
    await this.syncOrgIdWithUser();

    // ✅ Fourth: Show app
    await this.showMainApp();
  }

  // ====================================================
  // LOAD CONFIG
  // ====================================================

  async loadConfig() {
    try {
      const config = await chrome.storage.local.get([
        "supabaseUrl",
        "supabaseKey",
        "orgId",
        "autoConfigured",
      ]);

      console.log("⚙️ Config from storage:", {
        hasUrl: !!config.supabaseUrl,
        hasKey: !!config.supabaseKey,
        hasOrgId: !!config.orgId,
        autoConfigured: config.autoConfigured,
      });

      if (!config.supabaseUrl) {
        console.error("❌ Missing supabaseUrl");
        return false;
      }

      if (!config.supabaseKey) {
        console.error("❌ Missing supabaseKey");
        return false;
      }

      // Save to instance
      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;
      this.orgId = config.orgId; // Can be null initially

      return true;
    } catch (error) {
      console.error("❌ Config load error:", error);
      return false;
    }
  }

  // ====================================================
  // SYNC ORG ID WITH USER
  // ====================================================

  async syncOrgIdWithUser() {
    try {
      const auth = await chrome.storage.local.get("denetron_auth");

      if (auth.denetron_auth && auth.denetron_auth.user) {
        const userId = auth.denetron_auth.user.id;
        console.log("📍 Authenticated user ID:", userId);

        // Update orgId if different or missing
        if (this.orgId !== userId) {
          console.log("🔄 Updating orgId to match user ID");
          this.orgId = userId;
          await chrome.storage.local.set({ orgId: userId });
        }
      } else {
        console.warn("⚠️ No authenticated user found");
      }
    } catch (error) {
      console.error("❌ Sync org ID error:", error);
    }
  }

  // ====================================================
  // LOCAL STORAGE AUTH CHECK
  // ====================================================

  async checkLocalStorageAuth() {
    try {
      const tabs = await chrome.tabs.query({
        url: ["https://www.denetron.me/*", "https://denetron.me/*"],
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
            },
          });

          const authData = result?.[0]?.result;

          if (authData) {
            console.log("✅ Auth received from web login");
            await this.authHandler.saveAuth(authData);
            return;
          }
        } catch (err) {
          console.warn("⚠️ Tab access failed:", tab.id, err.message);
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
      ?.addEventListener("click", () => this.handleLogin());
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
  // LOGIN / LOGOUT
  // ====================================================

  handleLogin() {
    const loginUrl = this.authHandler.getLoginUrl();
    console.log("🔐 Opening login:", loginUrl);
    chrome.tabs.create({ url: loginUrl });
    window.close();
  }

  async handleLogout() {
    if (!confirm("Çıkış yapmak istediğinizden emin misiniz?")) return;
    await this.authHandler.clearAuth();
    window.location.reload();
  }

  // ====================================================
  // EVENT LISTENERS
  // ====================================================

  setupEventListeners() {
    // Logout button
    document
      .getElementById("btnLogout")
      ?.addEventListener("click", () => this.handleLogout());

    // Manual sync button
    document
      .getElementById("btnSync")
      ?.addEventListener("click", () => this.handleSync());

    // Dashboard button
    document
      .getElementById("btnOpenDashboard")
      ?.addEventListener("click", () => {
        chrome.tabs.create({
          url: "https://www.denetron.me/isg-bot",
        });
      });

    // ====================================================
    // İSG-KATİP SYNC BUTTON (GELİŞMİŞ)
    // ====================================================
    document
      .getElementById("btnSyncISGKatip")
      ?.addEventListener("click", async () => {
        await this.handleISGKatipSync();
      });
  }

  // ====================================================
  // İSG-KATİP SYNC HANDLER (GELİŞMİŞ)
  // ====================================================

  async handleISGKatipSync() {
    console.log("🔗 Checking İSG-KATİP session...");

    const LIST_URL = "https://isgkatip.csgb.gov.tr/Isyeri/IsyeriListesi";

    try {
      const tabs = await chrome.tabs.query({
        url: "https://isgkatip.csgb.gov.tr/*",
      });

      if (tabs.length > 0) {
        const tab = tabs[0];

        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });

        await chrome.storage.local.set({ pendingIsgkatipManualSync: true });

        const isListPage = tab.url?.includes("/Isyeri/IsyeriListesi");
        if (!isListPage) {
          await chrome.tabs.update(tab.id, { url: LIST_URL });
        }

        chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icon-128.png",
          title: "İSG-KATİP Senkronizasyonu",
          message:
            "Tek tık senkronizasyon başlatıldı. İşyeri listesi açılınca veriler otomatik aktarılacak.",
          priority: 1,
        });
      } else {
        await chrome.storage.local.set({ pendingIsgkatipManualSync: true });
        await chrome.tabs.create({ url: LIST_URL });

        chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icon-128.png",
          title: "İSG-KATİP Açılıyor",
          message: "Liste sayfası yüklenince veriler Denetron'a otomatik aktarılacak.",
          priority: 2,
        });

        chrome.action.setBadgeText({ text: "📋" });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      }

      window.close();
    } catch (error) {
      console.error("❌ İSG-KATİP sync hatası:", error);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon-128.png",
        title: "Senkronizasyon Başlatılamadı",
        message: "Lütfen İSG-KATİP'e giriş yapıp tekrar deneyin.",
        priority: 1,
      });
    }
  }

  // ====================================================
  // LOAD STATS
  // ====================================================

  async loadStats() {
    if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
      console.warn("⚠️ Missing config for stats:", {
        hasUrl: !!this.supabaseUrl,
        hasKey: !!this.supabaseKey,
        hasOrgId: !!this.orgId,
      });
      return;
    }

    console.log("📊 Loading stats from Supabase...");
    console.log("📍 Using org_id:", this.orgId);

    try {
      // Auth token al
      const authData = await chrome.storage.local.get("denetron_auth");
      const accessToken = authData.denetron_auth?.session?.access_token;

      const headers = {
        apikey: this.supabaseKey,
        Authorization: accessToken
          ? `Bearer ${accessToken}`
          : `Bearer ${this.supabaseKey}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/isgkatip_companies?org_id=eq.${this.orgId}&select=compliance_status`,
        { headers }
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
        criticalCount: companies.filter(
          (c) => c.compliance_status === "CRITICAL"
        ).length,
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
  // UPDATE UI
  // ====================================================

  updateStatsUI() {
    document.getElementById("totalCompanies").textContent =
      this.stats.totalCompanies ?? 0;

    document.getElementById("warningCount").textContent =
      this.stats.warningCount ?? 0;

    document.getElementById("criticalCount").textContent =
      this.stats.criticalCount ?? 0;

    console.log("✅ Stats UI updated");
  }

  async loadActivities() {
    const list = document.getElementById("activityList");
    if (!list) return;

    list.innerHTML = '<p class="empty-state">Henüz işlem yok</p>';
  }

  // ====================================================
  // MANUAL SYNC
  // ====================================================

  async handleSync() {
    const btn = document.getElementById("btnSync");
    const original = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = "⏳ Senkronize ediliyor...";

      console.log("🔄 Manual sync started");

      // Service worker'a mesaj gönder
      await chrome.runtime.sendMessage({ type: "SYNC_NOW" });

      // Reload stats
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