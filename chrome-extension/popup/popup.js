// chrome-extension/popup/popup.js

// ====================================================
// POPUP CONTROLLER - TAM DÜZELTİLMİŞ
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

    // ✅ Auto-configure if needed
    await this.autoConfigureIfNeeded();

    // ✅ Load config
    const configLoaded = await this.loadConfig();

    if (!configLoaded) {
      console.warn("⚠️ Extension not configured");
      this.showAuthScreen();
      return;
    }

    console.log("✅ Configuration loaded");

    // ✅ Check auth
    await this.checkLocalStorageAuth();

    const isAuth = await this.authHandler.isAuthenticated();

    if (!isAuth) {
      console.log("🔐 Not authenticated");
      this.showAuthScreen();
      return;
    }

    console.log("✅ Authenticated");

    // ✅ Sync org_id with user_id
    await this.syncOrgIdWithUser();

    // ✅ Show app
    await this.showMainApp();
  }

  // ====================================================
  // AUTO CONFIGURE
  // ====================================================

  async autoConfigureIfNeeded() {
    try {
      const config = await chrome.storage.local.get([
        "supabaseUrl",
        "supabaseKey",
        "autoConfigured",
      ]);

      // Eğer config yoksa, otomatik ayarla
      if (!config.supabaseUrl || !config.supabaseKey) {
        console.log("🔧 Auto-configuring extension...");

        const supabaseUrl = "https://elmdzekyyoepdrpnfppn.supabase.co";
        const supabaseKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWR6ZWt5eW9lcGRycG5mcHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MDI0NzcsImV4cCI6MjA1MjI3ODQ3N30.0u3dGmwXE1lHZIYNBIWWWX8d8UGCZxL0kWN2P-YBMPI";

        await chrome.storage.local.set({
          supabaseUrl,
          supabaseKey,
          autoConfigured: true,
        });

        console.log("✅ Auto-configuration complete");
      }
    } catch (error) {
      console.error("❌ Auto-configure error:", error);
    }
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
      this.orgId = config.orgId;

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

      if (auth.denetron_auth?.user?.id) {
        const userId = auth.denetron_auth.user.id;
        console.log("📍 Authenticated user ID:", userId);

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
    const loadingScreen = document.getElementById("loadingScreen");
    const authScreen = document.getElementById("authScreen");
    const mainApp = document.getElementById("mainApp");

    if (loadingScreen) loadingScreen.style.display = "flex";
    if (authScreen) authScreen.style.display = "none";
    if (mainApp) mainApp.style.display = "none";
  }

  showAuthScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    const authScreen = document.getElementById("authScreen");
    const mainApp = document.getElementById("mainApp");

    if (loadingScreen) loadingScreen.style.display = "none";
    if (authScreen) authScreen.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";

    document
      .getElementById("btnLogin")
      ?.addEventListener("click", () => this.handleLogin());
  }

  async showMainApp() {
    const loadingScreen = document.getElementById("loadingScreen");
    const authScreen = document.getElementById("authScreen");
    const mainApp = document.getElementById("mainApp");

    if (loadingScreen) loadingScreen.style.display = "none";
    if (authScreen) authScreen.style.display = "none";
    if (mainApp) mainApp.style.display = "block";

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

    // İSG-KATİP sync button
    document
      .getElementById("btnSyncISGKatip")
      ?.addEventListener("click", async () => {
        await this.handleISGKatipSync();
      });
  }

  // ====================================================
  // İSG-KATİP SYNC HANDLER
  // ====================================================

  // chrome-extension/popup/popup.js

// handleISGKatipSync fonksiyonunu güncelle:

async handleISGKatipSync() {
  console.log("🔗 İSG-KATİP senkronizasyonu başlatılıyor...");

  const targetUrl =
    "https://isgkatip.csgb.gov.tr/kisi-kurum/kisi-karti/kisi-kartim";

  try {
    const tabs = await chrome.tabs.query({
      url: "https://isgkatip.csgb.gov.tr/*",
    });

    if (tabs.length > 0) {
      const tab = tabs[0];
      const currentUrl = tab.url || "";

      console.log("✅ İSG-KATİP tab bulundu:", tab.id);

      // O tab'e geç
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });

      // ✅ FLAG AYARLA (Extension'dan açıldı)
      await chrome.storage.session.set({
        [`isgkatip_show_button_${tab.id}`]: true,
      });

      // Doğru sayfada değilse yönlendir
      if (!currentUrl.includes("/kisi-kurum/kisi-karti/kisi-kartim")) {
        console.log("🔄 Kişi Kartı sayfasına yönlendiriliyor...");

        await chrome.tabs.update(tab.id, { url: targetUrl });

        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon128.png",
          title: "İSG-KATİP",
          message: "Kişi Kartı sayfası yükleniyor...",
          priority: 1,
        });
      } else {
        // Zaten doğru sayfada, butonu göstermesi için mesaj gönder
        console.log("✅ Zaten doğru sayfada, buton gösteriliyor...");

        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: "SHOW_TRANSFER_BUTTON",
          });
        } catch (error) {
          console.warn("⚠️ Sayfa yenileniyor...");
          await chrome.tabs.reload(tab.id);
        }
      }
    } else {
      // Yeni tab aç
      console.log("ℹ️ Yeni İSG-KATİP tab açılıyor...");

      const newTab = await chrome.tabs.create({ url: targetUrl });

      // ✅ FLAG AYARLA
      await chrome.storage.session.set({
        [`isgkatip_show_button_${newTab.id}`]: true,
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icons/icon128.png",
        title: "İSG-KATİP",
        message:
          "Giriş yapın, buton otomatik görünecek.",
        priority: 2,
      });

      chrome.action.setBadgeText({ text: "📋" });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
    }

    window.close();
  } catch (error) {
    console.error("❌ İSG-KATİP sync hatası:", error);

    const newTab = await chrome.tabs.create({ url: targetUrl });

    await chrome.storage.session.set({
      [`isgkatip_show_button_${newTab.id}`]: true,
    });

    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "İSG-KATİP",
      message: "Giriş yapın ve Kişi Kartı sayfasına gidin.",
      priority: 1,
    });

    window.close();
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
    const totalEl = document.getElementById("totalCompanies");
    const warningEl = document.getElementById("warningCount");
    const criticalEl = document.getElementById("criticalCount");

    if (totalEl) totalEl.textContent = this.stats.totalCompanies ?? 0;
    if (warningEl) warningEl.textContent = this.stats.warningCount ?? 0;
    if (criticalEl) criticalEl.textContent = this.stats.criticalCount ?? 0;

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
    if (!btn) return;

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