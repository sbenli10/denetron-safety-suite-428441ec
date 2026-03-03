// ====================================================
// POPUP LOGIC
// ====================================================

class PopupController {
  constructor() {
    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0,
    };
    this.activities = [];
  }

  async init() {
    console.log('🚀 Popup initialized');

    // Load config
    await this.loadConfig();

    // Load stats
    await this.loadStats();

    // Setup event listeners
    this.setupEventListeners();

    // Load recent activities
    await this.loadActivities();

    // Update UI
    this.updateUI();
  }

  async loadConfig() {
    try {
      const config = await chrome.storage.local.get([
        'supabaseUrl',
        'supabaseKey',
        'orgId',
        'userId',
      ]);

      this.config = config;

      if (!config.supabaseUrl || !config.supabaseKey) {
        this.showStatus('Ayarlar eksik', 'error');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Config load error:', error);
      return false;
    }
  }

  async loadStats() {
    try {
      // Get stats from background
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATS',
      });

      if (response.success) {
        this.stats = response.stats;
      }
    } catch (error) {
      console.error('❌ Stats load error:', error);
    }
  }

  async loadActivities() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RECENT_ACTIVITIES',
        limit: 5,
      });

      if (response.success) {
        this.activities = response.activities;
      }
    } catch (error) {
      console.error('❌ Activities load error:', error);
    }
  }

  setupEventListeners() {
    // Sync button
    document.getElementById('btnSync').addEventListener('click', () => {
      this.handleSync();
    });

    // Bulk assign button
    document.getElementById('btnBulkAssign').addEventListener('click', () => {
      this.handleBulkAssign();
    });

    // Bulk download button
    document.getElementById('btnBulkDownload').addEventListener('click', () => {
      this.handleBulkDownload();
    });

    // Compliance button
    document.getElementById('btnCompliance').addEventListener('click', () => {
      this.handleComplianceCheck();
    });

    // Dashboard link
    document.getElementById('openDashboard').addEventListener('click', (e) => {
      e.preventDefault();
      this.openDashboard();
    });

    // Settings link
    document.getElementById('openSettings').addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });
  }

  updateUI() {
    // Update stats
    document.getElementById('totalCompanies').textContent = this.stats.totalCompanies;
    document.getElementById('warningCount').textContent = this.stats.warningCount;
    document.getElementById('criticalCount').textContent = this.stats.criticalCount;

    // Update activities
    const activityList = document.getElementById('activityList');

    if (this.activities.length === 0) {
      activityList.innerHTML = '<div class="activity-empty">Henüz işlem yok</div>';
    } else {
      activityList.innerHTML = this.activities
        .map(
          (activity) => `
          <div class="activity-item">
            <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
            <div class="activity-text">${activity.message}</div>
            <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
          </div>
        `
        )
        .join('');
    }
  }

  async handleSync() {
    this.showStatus('Senkronize ediliyor...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_NOW',
      });

      if (response.success) {
        this.showStatus('Senkronizasyon tamamlandı', 'success');
        await this.loadStats();
        this.updateUI();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.showStatus('Senkronizasyon hatası', 'error');
    }
  }

  async handleBulkAssign() {
    this.showStatus('Toplu atama başlatılıyor...', 'loading');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('isgkatip.csgb.gov.tr')) {
        alert('Bu işlem sadece İSG-KATİP sayfasında çalışır');
        return;
      }

      // Get selected companies from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTED_COMPANIES',
      });

      if (!response.data || response.data.length === 0) {
        alert('Lütfen en az bir firma seçin');
        return;
      }

      // Prompt for expert selection
      const expertId = prompt('Uzman ID girin:');
      if (!expertId) return;

      // Perform bulk assignment
      const assignResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'BULK_ASSIGN',
        payload: {
          companies: response.data,
          expertId,
        },
      });

      if (assignResponse.success) {
        this.showStatus(`${response.data.length} firma atandı`, 'success');
      } else {
        throw new Error(assignResponse.error);
      }
    } catch (error) {
      console.error('❌ Bulk assign error:', error);
      this.showStatus('Atama hatası', 'error');
    }
  }

  async handleBulkDownload() {
    this.showStatus('İndirme başlatılıyor...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'BULK_DOWNLOAD_PDF',
        data: {
          orgId: this.config.orgId,
        },
      });

      if (response.success) {
        this.showStatus('İndirme tamamlandı', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      this.showStatus('İndirme hatası', 'error');
    }
  }

  async handleComplianceCheck() {
    this.showStatus('Compliance kontrol ediliyor...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RUN_COMPLIANCE_CHECK',
        data: {
          orgId: this.config.orgId,
        },
      });

      if (response.success) {
        this.showStatus('Kontrol tamamlandı', 'success');
        
        // Show summary
        alert(
          `Compliance Özeti:\n\n` +
          `✅ Uyumlu: ${response.summary.compliant}\n` +
          `⚠️ Uyarı: ${response.summary.warning}\n` +
          `❌ Kritik: ${response.summary.critical}`
        );

        await this.loadStats();
        this.updateUI();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Compliance check error:', error);
      this.showStatus('Kontrol hatası', 'error');
    }
  }

  openDashboard() {
    const dashboardUrl = `${window.location.origin}/isg-bot-dashboard`;
    chrome.tabs.create({ url: dashboardUrl });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    const statusDot = statusEl.querySelector('.status-dot');
    const statusText = statusEl.querySelector('.status-text');

    statusText.textContent = message;

    // Update dot color
    statusDot.style.background =
      type === 'success'
        ? '#10b981'
        : type === 'error'
        ? '#ef4444'
        : type === 'loading'
        ? '#f59e0b'
        : '#3b82f6';

    // Reset after 3 seconds
    if (type !== 'loading') {
      setTimeout(() => {
        statusText.textContent = 'Hazır';
        statusDot.style.background = '#10b981';
      }, 3000);
    }
  }

  getActivityIcon(type) {
    const icons = {
      sync: '🔄',
      assign: '👤',
      download: '📥',
      compliance: '✅',
      error: '❌',
    };

    return icons[type] || '•';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes}dk önce`;
    if (hours < 24) return `${hours}s önce`;
    return `${days}g önce`;
  }
}

// Initialize popup
const popup = new PopupController();
popup.init();