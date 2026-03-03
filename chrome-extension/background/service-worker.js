// ====================================================
// BACKGROUND SERVICE WORKER
// ====================================================

import { SyncManager } from './sync-manager.js';
import { RuleEngine } from './rule-engine.js';
import { QueueManager } from './queue-manager.js';
import { AuthHandler } from '../auth/auth-handler.js';

class BackgroundService {
  constructor() {
    this.syncManager = new SyncManager();
    this.ruleEngine = new RuleEngine();
    this.queueManager = new QueueManager();
    this.authHandler = new AuthHandler();
  }

  async init() {
    console.log('🔧 Background service started');

    // Listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Async
    });

    // Token refresh alarm
    chrome.alarms.create('tokenRefresh', { periodInMinutes: 5 });
    
    // Periodic sync alarm
    chrome.alarms.create('periodicSync', { periodInMinutes: 30 });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'tokenRefresh') {
        this.checkAndRefreshToken();
      } else if (alarm.name === 'periodicSync') {
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

        case 'DENETRON_AUTH_SUCCESS':
          // Forward to popup
          chrome.runtime.sendMessage(message);
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

  async checkAndRefreshToken() {
    const auth = await this.authHandler.getAuth();
    
    if (!auth) {
      return;
    }

    // Refresh if token expires in < 10 minutes
    if (Date.now() >= (auth.expiresAt - 10 * 60 * 1000)) {
      console.log('🔄 Auto-refreshing token...');
      await this.authHandler.refreshToken();
    }
  }

  async handleCompanyData(data) {
    try {
      const token = await this.authHandler.getAccessToken();
      const user = await this.authHandler.getUser();

      if (!token || !user) {
        console.error('❌ No auth token available');
        return;
      }

      // Queue'ya ekle
      await this.queueManager.add({
        type: 'COMPANY_UPDATE',
        data,
        timestamp: Date.now(),
      });

      // Compliance check
      const complianceResult = await this.ruleEngine.checkCompliance(data);

      // Supabase'e sync
      await this.syncManager.syncToSupabase(
        {
          ...data,
          compliance: complianceResult,
          orgId: user.id,
        },
        token
      );

      console.log('✅ Company data processed:', data.sgkNo);
    } catch (error) {
      console.error('❌ Handle company data error:', error);
    }
  }

  async syncAll() {
    console.log('🔄 Starting full sync...');
    
    try {
      const token = await this.authHandler.getAccessToken();
      
      if (!token) {
        console.error('❌ No auth token for sync');
        return;
      }

      const items = await this.queueManager.getAll();
      
      for (const item of items) {
        await this.syncManager.syncToSupabase(item.data, token);
        await this.queueManager.remove(item.id);
      }

      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }
}

// Initialize
const service = new BackgroundService();
service.init();

console.log('🟢 Background service loaded');