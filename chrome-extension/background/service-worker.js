// ====================================================
// BACKGROUND SERVICE WORKER - STABLE VERSION
// ====================================================

import { SyncManager } from "./sync-manager.js";
import { RuleEngine } from "./rule-engine.js";
import { QueueManager } from "./queue-manager.js";

class BackgroundService {

  constructor() {

    this.syncManager = new SyncManager();
    this.ruleEngine = new RuleEngine();
    this.queueManager = new QueueManager();

    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.orgId = null;
    this.userId = null;

    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0
    };

    this.activities = [];

  }

  // ====================================================
  // INIT
  // ====================================================

  async init() {

    console.log("🔧 Background service started");

    await this.loadConfig();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    chrome.alarms.create("periodicSync", {
      periodInMinutes: 30
    });

    chrome.alarms.onAlarm.addListener((alarm) => {

      if (alarm.name === "periodicSync") {
        this.syncAll();
      }

    });

    console.log("✅ Background ready");

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
        "userId"
      ]);

      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;
      this.orgId = config.orgId;
      this.userId = config.userId;

      console.log("📦 Config loaded", {
        url: this.supabaseUrl,
        orgId: this.orgId
      });

    } catch (err) {

      console.error("❌ Config load error", err);

    }

  }

  // ====================================================
  // LOAD STATS
  // ====================================================

  async loadStats() {

    if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {

      console.warn("⚠️ Missing config for stats");

      return this.stats;

    }

    try {

      console.log("📊 Fetching companies...");

      const response = await fetch(

        `${this.supabaseUrl}/rest/v1/isgkatip_companies?org_id=eq.${this.orgId}&select=compliance_status`,

        {
          method: "GET",
          headers: {
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json"
          }
        }

      );

      if (!response.ok) {

        throw new Error(`HTTP ${response.status}`);

      }

      const companies = await response.json();

      console.log("📊 Companies:", companies.length);

      const warning = companies.filter(
        c => c.compliance_status === "WARNING"
      ).length;

      const critical = companies.filter(
        c => c.compliance_status === "CRITICAL"
      ).length;

      this.stats = {
        totalCompanies: companies.length,
        warningCount: warning,
        criticalCount: critical
      };

      await chrome.storage.local.set({
        stats: this.stats
      });

      console.log("✅ Stats updated", this.stats);

      return this.stats;

    } catch (err) {

      console.error("❌ Stats error", err);

      return this.stats;

    }

  }

  // ====================================================
  // MESSAGE HANDLER
  // ====================================================

  async handleMessage(message, sender, sendResponse) {

    try {

      switch (message.type) {

        case "GET_STATS":

          const stats = await this.loadStats();

          sendResponse({
            success: true,
            stats
          });

          break;

        case "GET_RECENT_ACTIVITIES":

          sendResponse({
            success: true,
            activities: this.activities
          });

          break;

        case "SYNC_NOW":

          await this.syncAll();

          sendResponse({ success: true });

          break;

        case "CONFIG_UPDATED":

          await this.loadConfig();
          await this.loadStats();

          sendResponse({ success: true });

          break;

        default:

          sendResponse({
            success: false,
            error: "Unknown message"
          });

      }

    } catch (err) {

      console.error("❌ Message error", err);

      sendResponse({
        success: false,
        error: err.message
      });

    }

  }

  // ====================================================
  // SYNC
  // ====================================================

  async syncAll() {

    try {

      console.log("🔄 Sync started");

      const items = await this.queueManager.getAll();

      for (const item of items) {

        await this.syncManager.syncToSupabase(item.data);

        await this.queueManager.remove(item.id);

      }

      await this.loadStats();

      this.activities.unshift({
        type: "sync",
        message: "Senkronizasyon tamamlandı",
        timestamp: Date.now()
      });

      this.activities = this.activities.slice(0, 10);

      console.log("✅ Sync finished");

    } catch (err) {

      console.error("❌ Sync error", err);

    }

  }

}

// ====================================================
// START
// ====================================================

const backgroundService = new BackgroundService();

backgroundService.init();

console.log("🟢 Service worker loaded");