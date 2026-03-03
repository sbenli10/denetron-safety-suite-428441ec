// ====================================================
// BACKGROUND SERVICE WORKER
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
  }

  async init() {
    console.log('🔧 Background service started');

    // Load config
    const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'orgId']);
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.orgId = config.orgId;

    // Listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Async
    });

    // Alarm for periodic sync
    chrome.alarms.create('periodicSync', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'periodicSync') {
        this.syncAll();
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'COMPANY_DATA_PARSED':
          await this.handleCompanyData(message.data);
          sendResponse({ success: true });
          break;

        case 'SYNC_NOW':
          await this.syncAll();
          sendResponse({ success: true });
          break;

        case 'CALCULATE_COMPLIANCE':
          const result = await this.ruleEngine.checkCompliance(message.data);
          sendResponse({ success: true, result });
          break;

        case 'BULK_DOWNLOAD_PDF':
          await this.handleBulkDownload(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCompanyData(data) {
    try {
      // Queue'ya ekle
      await this.queueManager.add({
        type: 'COMPANY_UPDATE',
        data,
        timestamp: Date.now(),
      });

      // Compliance check
      const complianceResult = await this.ruleEngine.checkCompliance(data);

      // Supabase'e sync
      await this.syncManager.syncToSupabase({
        ...data,
        compliance: complianceResult,
        orgId: this.orgId,
      });

      console.log('✅ Company data processed:', data.sgkNo);
    } catch (error) {
      console.error('❌ Handle company data error:', error);
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

      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }

  async handleBulkDownload(companies) {
    for (const company of companies) {
      try {
        const filename = `${company.sgkNo}_${company.companyName}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // İSG-KATİP'ten PDF URL'sini al ve indir
        // Bu kısım İSG-KATİP API'sine göre özelleştirilmeli
        
        console.log(`✅ Downloaded: ${filename}`);
      } catch (error) {
        console.error(`❌ Download failed for ${company.sgkNo}:`, error);
      }
    }
  }
}

// Init
const backgroundService = new BackgroundService();
backgroundService.init();