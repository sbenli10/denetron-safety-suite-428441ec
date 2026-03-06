// chrome-extension/background/service-worker.js

// ====================================================
// BACKGROUND SERVICE WORKER
// ====================================================

import { AuthHandler } from "../auth/auth-handler.js";

class BackgroundService {
  constructor() {
    this.authHandler = new AuthHandler();
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.orgId = null;
  }

  // ====================================================
  // INIT
  // ====================================================

  async init() {
    console.log("🔧 Background service started");

    await this.loadConfig();
    await this.setupListeners();

    console.log("✅ Background ready");
  }

  // ====================================================
  // CONFIG
  // ====================================================

  async loadConfig() {
    try {
      const config = await chrome.storage.local.get([
        "supabaseUrl",
        "supabaseKey",
        "orgId",
        "denetron_auth",
      ]);

      // Authenticated user ID'yi org_id olarak kullan
      if (config.denetron_auth?.user?.id) {
        this.orgId = config.denetron_auth.user.id;
        console.log("✅ Using authenticated user ID as org_id:", this.orgId);
      } else if (config.orgId) {
        this.orgId = config.orgId;
        console.log("✅ Using stored org_id:", this.orgId);
      }

      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;

      console.log("✅ Config loaded:", {
        url: this.supabaseUrl,
        orgId: this.orgId,
      });

      if (!this.supabaseUrl || !this.supabaseKey) {
        console.warn("⚠️ Config incomplete");
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Config load error:", error);
      return false;
    }
  }

  // ====================================================
  // LISTENERS
  // ====================================================

  async setupListeners() {
    // Message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Async response için
    });

    // Tab update listener
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

  // ====================================================
  // MESSAGE HANDLER
  // ====================================================

  async handleMessage(message, sender, sendResponse) {
    console.log("📨 Message received:", message.type);

    try {
      switch (message.type) {
        case "SYNC_NOW":
          await this.handleManualSync();
          sendResponse({ success: true });
          break;

        case "ISGKATIP_COMPANIES_SCRAPED":
          await this.handleISGKatipSync(message.data, message.metadata);
          sendResponse({ success: true });
          break;

        case "GET_CONFIG":
          sendResponse({
            supabaseUrl: this.supabaseUrl,
            supabaseKey: this.supabaseKey,
            orgId: this.orgId,
          });
          break;

        default:
          console.warn("⚠️ Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("❌ Message handler error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ====================================================
  // İSG-KATİP SYNC HANDLER (YENİ!)
  // ====================================================

  async handleISGKatipSync(companies, metadata) {
    console.log("📦 İSG-KATİP verisi alındı");
    console.log("📊 Toplam işyeri:", companies.length);
    console.log("📅 Tarih:", metadata.scrapedAt);
    console.log("🔗 Kaynak:", metadata.sourceUrl);

    try {
      // Config kontrol
      if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
        console.error("❌ Config eksik!");
        throw new Error("Supabase config eksik");
      }

      // Auth token al
      const authData = await chrome.storage.local.get("denetron_auth");
      const accessToken = authData.denetron_auth?.session?.access_token;

      const headers = {
        apikey: this.supabaseKey,
        Authorization: accessToken
          ? `Bearer ${accessToken}`
          : `Bearer ${this.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      };

      // Supabase'e kaydet
      let successCount = 0;
      let errorCount = 0;

      for (const company of companies) {
        try {
          const response = await fetch(
            `${this.supabaseUrl}/rest/v1/isgkatip_companies`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                org_id: this.orgId,
                sgk_no: company.sgk_no,
                company_name: company.company_name,
                employee_count: company.employee_count,
                hazard_class: company.hazard_class,
                assigned_minutes: company.assigned_minutes || 0,
                required_minutes: company.required_minutes || 0,
                compliance_status: this.calculateComplianceStatus(
                  company.assigned_minutes,
                  company.required_minutes
                ),
                risk_score: this.calculateRiskScore(company),
                contract_start: company.contract_start || null,
                contract_end: company.contract_end || null,
                last_synced_at: new Date().toISOString(),
              }),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              "❌ Kayıt hatası:",
              company.company_name,
              response.status
            );
          }
        } catch (error) {
          errorCount++;
          console.error("❌ Fetch hatası:", company.company_name, error);
        }
      }

      console.log(`✅ Başarılı: ${successCount}`);
      console.log(`❌ Hatalı: ${errorCount}`);

      // Sync log kaydet
      await this.saveSyncLog({
        source: "ISGKATIP_SCRAPER",
        total_companies: companies.length,
        success_count: successCount,
        error_count: errorCount,
        metadata,
      });

      // Badge güncelle
      chrome.action.setBadgeText({ text: successCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

      // Notification göster
      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icons/icon128.png",
        title: "İSG-KATİP Senkronizasyonu",
        message: `${successCount} işyeri başarıyla senkronize edildi!`,
        priority: 2,
      });

      // Stats'ı güncelle
      await this.loadStats();
    } catch (error) {
      console.error("❌ Senkronizasyon hatası:", error);

      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icons/icon128.png",
        title: "Senkronizasyon Hatası",
        message: error.message || "Veriler kaydedilemedi",
        priority: 2,
      });
    }
  }

  // ====================================================
  // HELPER FUNCTIONS (YENİ!)
  // ====================================================

  calculateComplianceStatus(assigned, required) {
    if (!required || required === 0) return "UNKNOWN";
    if (assigned >= required) return "COMPLIANT";
    if (assigned >= required * 0.8) return "WARNING";
    return "CRITICAL";
  }

  calculateRiskScore(company) {
    let score = 50; // Base score

    // Tehlike sınıfı
    if (company.hazard_class?.includes("Çok Tehlikeli")) score += 30;
    else if (company.hazard_class?.includes("Tehlikeli")) score += 15;

    // Çalışan sayısı
    if (company.employee_count > 100) score += 10;
    else if (company.employee_count > 50) score += 5;

    // Compliance durumu
    const complianceStatus = this.calculateComplianceStatus(
      company.assigned_minutes,
      company.required_minutes
    );

    if (complianceStatus === "CRITICAL") score += 20;
    else if (complianceStatus === "WARNING") score += 10;

    return Math.min(score, 100);
  }

  async saveSyncLog(logData) {
    try {
      await fetch(`${this.supabaseUrl}/rest/v1/isgkatip_sync_logs`, {
        method: "POST",
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: this.orgId,
          ...logData,
          synced_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("❌ Sync log hatası:", error);
    }
  }

  // ====================================================
  // STATS
  // ====================================================

  async loadStats() {
    if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
      console.warn("⚠️ Missing config for stats");
      return;
    }

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
        throw new Error(`HTTP ${response.status}`);
      }

      const companies = await response.json();

      const stats = {
        totalCompanies: companies.length,
        warningCount: companies.filter((c) => c.compliance_status === "WARNING")
          .length,
        criticalCount: companies.filter(
          (c) => c.compliance_status === "CRITICAL"
        ).length,
      };

      await chrome.storage.local.set({ stats });

      console.log("📊 Stats updated:", stats);
    } catch (error) {
      console.error("❌ Stats load error:", error);
    }
  }

  // ====================================================
  // MANUAL SYNC
  // ====================================================

  async handleManualSync() {
    console.log("🔄 Manual sync triggered");
    await this.loadStats();
  }

  // ====================================================
  // TAB UPDATE
  // ====================================================

  async handleTabUpdate(tabId, tab) {
    // İSG-KATİP sitesinde mi?
    if (tab.url?.includes("isgkatip.csgb.gov.tr")) {
      console.log("📍 İSG-KATİP sitesi tespit edildi");

      // Badge göster
      chrome.action.setBadgeText({ tabId, text: "🔍" });
      chrome.action.setBadgeBackgroundColor({ color: "#2196F3" });
    }
  }
}

// ====================================================
// START
// ====================================================

const service = new BackgroundService();
service.init();

console.log("🟢 Service worker loaded");