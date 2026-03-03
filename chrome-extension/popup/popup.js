// ====================================================
// POPUP LOGIC - AUTO-CONFIG + OAUTH READY
// ====================================================

class PopupController {
  constructor() {
    this.stats = {
      totalCompanies: 0,
      warningCount: 0,
      criticalCount: 0,
    };
    this.activities = [];
    this.authenticated = false;
    this.config = null;
  }

  async init() {
    console.log('🚀 Popup initialized');

    // Check authentication
    const isConfigured = await this.checkConfiguration();

    if (!isConfigured) {
      this.showConfigurationRequired();
      return;
    }

    this.authenticated = true;

    // Load stats
    await this.loadStats();

    // Setup event listeners
    this.setupEventListeners();

    // Load recent activities
    await this.loadActivities();

    // Update UI
    this.updateUI();

    console.log('✅ Popup ready');
  }

  async checkConfiguration() {
    try {
      const config = await chrome.storage.local.get([
        'supabaseUrl',
        'supabaseKey',
        'orgId',
        'userId',
        'autoConfigured',
      ]);

      this.config = config;

      // Check if all required fields exist
      if (!config.supabaseUrl || !config.supabaseKey) {
        console.warn('⚠️ Configuration missing');
        return false;
      }

      // Validate URL format
      if (!config.supabaseUrl.includes('supabase.co')) {
        console.error('❌ Invalid Supabase URL');
        return false;
      }

      console.log('✅ Configuration valid');
      return true;
    } catch (error) {
      console.error('❌ Config check error:', error);
      return false;
    }
  }

  showConfigurationRequired() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.innerHTML = `
      <div class="config-required">
        <div class="config-icon">⚙️</div>
        <h2>Yapılandırma Gerekli</h2>
        <p>Extension'ı kullanmak için ayarları yapılandırmanız gerekiyor.</p>
        
        <button id="openSettingsBtn" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M1 12h6m6 0h6M1 12l3-3m-3 3l3 3m18-3l-3-3m3 3l-3 3"></path>
          </svg>
          Ayarları Aç
        </button>

        <div class="config-help">
          <p class="help-text">
            <strong>Otomatik yapılandırma çalışmadı mı?</strong><br>
            Ayarlar sayfasından Supabase bilgilerinizi manuel olarak girebilirsiniz.
          </p>
        </div>
      </div>

      <style>
        .config-required {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .config-icon {
          font-size: 64px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .config-required h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e293b;
        }

        .config-required p {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
          max-width: 280px;
        }

        .config-help {
          margin-top: 24px;
          padding: 16px;
          background: #f1f5f9;
          border-radius: 8px;
          max-width: 320px;
        }

        .help-text {
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
        }

        .help-text strong {
          color: #1e293b;
        }
      </style>
    `;

    // Setup settings button
    document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
      this.openSettings();
    });
  }

  async loadStats() {
    try {
      // Get stats from background
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATS',
      });

      if (response && response.success) {
        this.stats = response.stats;
        console.log('✅ Stats loaded:', this.stats);
      } else {
        console.warn('⚠️ Stats not available yet');
        // Use default stats
        this.stats = {
          totalCompanies: 0,
          warningCount: 0,
          criticalCount: 0,
        };
      }
    } catch (error) {
      console.error('❌ Stats load error:', error);
      // Fallback to default stats
      this.stats = {
        totalCompanies: 0,
        warningCount: 0,
        criticalCount: 0,
      };
    }
  }

  async loadActivities() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RECENT_ACTIVITIES',
        limit: 5,
      });

      if (response && response.success) {
        this.activities = response.activities || [];
        console.log('✅ Activities loaded:', this.activities.length);
      } else {
        console.warn('⚠️ Activities not available yet');
        this.activities = [];
      }
    } catch (error) {
      console.error('❌ Activities load error:', error);
      this.activities = [];
    }
  }

  setupEventListeners() {
    // Sync button
    const btnSync = document.getElementById('btnSync');
    if (btnSync) {
      btnSync.addEventListener('click', () => this.handleSync());
    }

    // Bulk assign button
    const btnBulkAssign = document.getElementById('btnBulkAssign');
    if (btnBulkAssign) {
      btnBulkAssign.addEventListener('click', () => this.handleBulkAssign());
    }

    // Bulk download button
    const btnBulkDownload = document.getElementById('btnBulkDownload');
    if (btnBulkDownload) {
      btnBulkDownload.addEventListener('click', () => this.handleBulkDownload());
    }

    // Compliance button
    const btnCompliance = document.getElementById('btnCompliance');
    if (btnCompliance) {
      btnCompliance.addEventListener('click', () => this.handleComplianceCheck());
    }

    // Dashboard link
    const openDashboard = document.getElementById('openDashboard');
    if (openDashboard) {
      openDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDashboard();
      });
    }

    // Settings link
    const openSettings = document.getElementById('openSettings');
    if (openSettings) {
      openSettings.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSettings();
      });
    }
  }

  updateUI() {
    // Update stats
    const totalCompaniesEl = document.getElementById('totalCompanies');
    if (totalCompaniesEl) {
      totalCompaniesEl.textContent = this.stats.totalCompanies;
    }

    const warningCountEl = document.getElementById('warningCount');
    if (warningCountEl) {
      warningCountEl.textContent = this.stats.warningCount;
    }

    const criticalCountEl = document.getElementById('criticalCount');
    if (criticalCountEl) {
      criticalCountEl.textContent = this.stats.criticalCount;
    }

    // Update activities
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

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

    console.log('✅ UI updated');
  }

  async handleSync() {
    this.showStatus('Senkronize ediliyor...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_NOW',
      });

      if (response && response.success) {
        this.showStatus('Senkronizasyon tamamlandı', 'success');
        await this.loadStats();
        this.updateUI();
      } else {
        throw new Error(response?.error || 'Sync failed');
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

      if (!tab.url || !tab.url.includes('isgkatip.csgb.gov.tr')) {
        this.showStatus('İSG-KATİP sayfasında olmalısınız', 'error');
        return;
      }

      // Get selected companies from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTED_COMPANIES',
      });

      if (!response || !response.data || response.data.length === 0) {
        this.showStatus('Lütfen firma seçin', 'error');
        return;
      }

      // Prompt for expert selection
      const expertId = prompt('Uzman ID girin:');
      if (!expertId) {
        this.showStatus('Atama iptal edildi', 'info');
        return;
      }

      // Perform bulk assignment
      const assignResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'BULK_ASSIGN',
        payload: {
          companies: response.data,
          expertId,
        },
      });

      if (assignResponse && assignResponse.success) {
        this.showStatus(`${response.data.length} firma atandı`, 'success');
      } else {
        throw new Error(assignResponse?.error || 'Assignment failed');
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

      if (response && response.success) {
        this.showStatus('İndirme tamamlandı', 'success');
      } else {
        throw new Error(response?.error || 'Download failed');
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

      if (response && response.success) {
        this.showStatus('Kontrol tamamlandı', 'success');

        // Show summary
        const summary = response.summary || {
          compliant: 0,
          warning: 0,
          critical: 0,
        };

        alert(
          `Compliance Özeti:\n\n` +
            `✅ Uyumlu: ${summary.compliant}\n` +
            `⚠️ Uyarı: ${summary.warning}\n` +
            `❌ Kritik: ${summary.critical}`
        );

        await this.loadStats();
        this.updateUI();
      } else {
        throw new Error(response?.error || 'Compliance check failed');
      }
    } catch (error) {
      console.error('❌ Compliance check error:', error);
      this.showStatus('Kontrol hatası', 'error');
    }
  }

  openDashboard() {
    // Try multiple dashboard URLs
    const dashboardUrls = [
      'http://localhost:8080/isg-bot',
      'https://app.denetron.com/isg-bot',
      chrome.runtime.getURL('dashboard.html'),
    ];

    // Use first available URL (in production, use actual domain)
    chrome.tabs.create({ url: dashboardUrls[0] });
  }

  openSettings() {
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('❌ Open settings error:', error);
      // Fallback: open in new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;

    const statusDot = statusEl.querySelector('.status-dot');
    const statusText = statusEl.querySelector('.status-text');

    if (statusText) {
      statusText.textContent = message;
    }

    // Update dot color
    if (statusDot) {
      statusDot.style.background =
        type === 'success'
          ? '#10b981'
          : type === 'error'
          ? '#ef4444'
          : type === 'loading'
          ? '#f59e0b'
          : '#3b82f6';
    }

    console.log(`[${type.toUpperCase()}] ${message}`);

    // Reset after 3 seconds (except for loading)
    if (type !== 'loading') {
      setTimeout(() => {
        if (statusText) statusText.textContent = 'Hazır';
        if (statusDot) statusDot.style.background = '#10b981';
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
      info: 'ℹ️',
    };

    return icons[type] || '•';
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Bilinmiyor';

    try {
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
    } catch (error) {
      return 'Bilinmiyor';
    }
  }
}

// ====================================================
// INITIALIZE POPUP
// ====================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupController();
    popup.init();
  });
} else {
  const popup = new PopupController();
  popup.init();
}