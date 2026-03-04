// ====================================================
// BACKGROUND SERVICE WORKER - DÜZELTİLMİŞ
// ====================================================

import { SyncManager } from './sync-manager.js';
import { RuleEngine } from './rule-engine.js';
import { QueueManager } from './queue-manager.js';

class BackgroundService {
  constructor() {
    this.syncManager = new SyncManager();
    this.ruleEngine = new RuleEngine();
    this.queueManager = new QueueManager();
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.orgId = null;
    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0,
    };
    this.activities = [];
  }

  async init() {
    console.log('🔧 Background service started');

    // Load config
    await this.loadConfig();

    // Load initial stats
    await this.loadStats();

    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Async response
    });

    // Setup periodic sync
    chrome.alarms.create('periodicSync', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'periodicSync') {
        this.syncAll();
      }
    });

    console.log('✅ Background service ready');
  }

  async loadConfig() {
    try {
      const config = await chrome.storage.local.get([
        'supabaseUrl',
        'supabaseKey',
        'orgId',
        'userId',
      ]);

      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;
      this.orgId = config.orgId;
      this.userId = config.userId;

      if (this.supabaseUrl && this.supabaseKey && this.orgId) {
        console.log('✅ Config loaded:', {
          url: this.supabaseUrl?.substring(0, 30) + '...',
          orgId: this.orgId,
        });
      } else {
        console.warn('⚠️ Config incomplete');
      }
    } catch (error) {
      console.error('❌ Config load error:', error);
    }
  }

  async loadStats() {
    if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
      console.warn('⚠️ Cannot load stats: Config missing');
      return;
    }

    try {
      console.log('📊 Loading stats from Supabase...');

      // ✅ DIRECT SUPABASE REST API CALL
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

      console.log('✅ Companies fetched:', companies.length);

      this.stats = {
        totalCompanies: companies.length,
        warningCount: companies.filter((c) => c.compliance_status === 'WARNING').length,
        criticalCount: companies.filter((c) => c.compliance_status === 'CRITICAL').length,
      };

      console.log('📊 Stats updated:', this.stats);

      // Save to storage for quick access
      await chrome.storage.local.set({ stats: this.stats });
    } catch (error) {
      console.error('❌ Stats load error:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📩 Message received:', message.type);

    try {
      switch (message.type) {
        case 'GET_STATS':
          await this.loadStats(); // Refresh stats
          sendResponse({ success: true, stats: this.stats });
          break;

        case 'GET_RECENT_ACTIVITIES':
          sendResponse({ success: true, activities: this.activities });
          break;

        case 'SYNC_NOW':
          await this.syncAll();
          sendResponse({ success: true });
          break;

        case 'RUN_COMPLIANCE_CHECK':
          const result = await this.runComplianceCheck(message.data);
          sendResponse({ success: true, ...result });
          break;

        case 'COMPANY_DATA_PARSED':
          await this.handleCompanyData(message.data);
          sendResponse({ success: true });
          break;

        case 'CONFIG_UPDATED':
          await this.loadConfig();
          await this.loadStats();
          sendResponse({ success: true });
          break;

        case 'BULK_DOWNLOAD_PDF':
          await this.handleBulkDownload(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCompanyData(data) {
    try {
      console.log('📥 Company data received:', data.sgkNo);

      // Add to queue
      await this.queueManager.add({
        type: 'COMPANY_UPDATE',
        data,
        timestamp: Date.now(),
      });

      // Run compliance check
      const complianceResult = await this.ruleEngine.checkCompliance(data);

      // Sync to Supabase
      if (this.syncManager && this.orgId) {
        await this.syncManager.syncToSupabase({
          ...data,
          compliance: complianceResult,
          orgId: this.orgId,
        });
      }

      // Add activity
      this.activities.unshift({
        type: 'sync',
        message: `${data.companyName} senkronize edildi`,
        timestamp: Date.now(),
      });

      // Keep only last 10 activities
      this.activities = this.activities.slice(0, 10);

      // Reload stats
      await this.loadStats();

      console.log('✅ Company data processed:', data.sgkNo);
    } catch (error) {
      console.error('❌ Handle company data error:', error);

      // Add error activity
      this.activities.unshift({
        type: 'error',
        message: `Hata: ${data.companyName || 'Bilinmeyen firma'}`,
        timestamp: Date.now(),
      });
    }
  }

  async syncAll() {
    console.log('🔄 Starting full sync...');

    try {
      const items = await this.queueManager.getAll();

      for (const item of items) {
        await this.syncManager.syncToSupabase(item.data);
        await this.queueManager.remove(item.id);
      }

      await this.loadStats();

      this.activities.unshift({
        type: 'sync',
        message: 'Tam senkronizasyon tamamlandı',
        timestamp: Date.now(),
      });

      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Sync error:', error);

      this.activities.unshift({
        type: 'error',
        message: 'Senkronizasyon hatası',
        timestamp: Date.now(),
      });
    }
  }

  async runComplianceCheck(data) {
    console.log('🛡️ Running compliance check...');

    try {
      if (!this.supabaseUrl || !this.supabaseKey || !this.orgId) {
        throw new Error('Config missing');
      }

      // Get all companies
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/isgkatip_companies?org_id=eq.${this.orgId}&select=*`,
        {
          headers: {
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const companies = await response.json();

      // Count by status
      const summary = {
        compliant: companies.filter((c) => c.compliance_status === 'COMPLIANT').length,
        warning: companies.filter((c) => c.compliance_status === 'WARNING').length,
        critical: companies.filter((c) => c.compliance_status === 'CRITICAL').length,
      };

      console.log('✅ Compliance check completed:', summary);

      return { summary };
    } catch (error) {
      console.error('❌ Compliance check error:', error);
      throw error;
    }
  }

  async handleBulkDownload(data) {
    console.log('📥 Bulk download started');
    // TODO: Implement PDF download logic
  }
}

// ====================================================
// INITIALIZE
// ====================================================
const backgroundService = new BackgroundService();
backgroundService.init();

console.log('🟢 Background service worker loaded');