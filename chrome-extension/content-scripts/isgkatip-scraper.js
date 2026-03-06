// chrome-extension/content-scripts/isgkatip-scraper.js

// ====================================================
// İSG-KATİP SCRAPER - HER ZAMAN AKTİF BUTON
// ====================================================

console.log("🔍 İSG-KATİP Scraper başlatıldı");

const CONFIG = {
  minDelay: 1000, // Sayfa yüklenmesi için bekleme
  autoSync: true, // Otomatik senkronizasyon
  debug: true,
  pendingSyncKey: "pendingIsgkatipManualSync",
};

// İşyeri listesi için selector'lar (site yapısına göre güncellenecek)
const SELECTORS = {
  // Tablo
  table: 'table',
  rows: 'table tbody tr',
  
  // Kolonlar (index veya class'a göre)
  companyName: 'td:nth-child(1)', // Örnek: 1. kolon
  sgkNo: 'td:nth-child(2)',
  employees: 'td:nth-child(3)',
  hazardClass: 'td:nth-child(4)',
  naceCode: 'td:nth-child(5)',
  contractStart: 'td:nth-child(6)',
  contractEnd: 'td:nth-child(7)',
  assignedMinutes: 'td:nth-child(8)',
  requiredMinutes: 'td:nth-child(9)',
};

// ====================================================
// SCRAPE COMPANIES
// ====================================================

async function scrapeCompanies() {
  console.log('📊 İşyeri verilerini topluyorum...');
  
  // Sayfa yüklenmesini bekle
  await waitForElement(SELECTORS.table);
  
  const companies = [];
  const rows = document.querySelectorAll(SELECTORS.rows);
  
  console.log(`📋 ${rows.length} işyeri satırı bulundu`);
  
  rows.forEach((row, index) => {
    try {
      const company = extractCompanyData(row);
      
      if (company.company_name && company.sgk_no) {
        companies.push(company);
        
        if (CONFIG.debug) {
          console.log(`✅ ${index + 1}. ${company.company_name} - ${company.sgk_no}`);
        }
      }
    } catch (error) {
      console.error(`❌ Satır ${index + 1} parse hatası:`, error);
    }
  });
  
  console.log(`📦 Toplam ${companies.length} işyeri başarıyla işlendi`);
  
  // Service worker'a gönder
  if (companies.length > 0) {
    chrome.runtime.sendMessage({
      type: 'ISGKATIP_COMPANIES_SCRAPED',
      data: companies,
      metadata: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        totalFound: companies.length,
      },
    });
  }
  
  return companies;
}

function extractCompanyData(row) {
  const getText = (selector) => {
    const el = row.querySelector(selector);
    return el ? el.textContent.trim() : '';
  };
  
  const getNumber = (selector) => {
    const text = getText(selector);
    const num = parseInt(text.replace(/\D/g, ''));
    return isNaN(num) ? 0 : num;
  };
  
  return {
    company_name: getText(SELECTORS.companyName),
    sgk_no: getText(SELECTORS.sgkNo),
    employee_count: getNumber(SELECTORS.employees),
    hazard_class: getText(SELECTORS.hazardClass) || 'Az Tehlikeli',
    nace_code: getText(SELECTORS.naceCode),
    contract_start: getText(SELECTORS.contractStart),
    contract_end: getText(SELECTORS.contractEnd),
    assigned_minutes: getNumber(SELECTORS.assignedMinutes),
    required_minutes: getNumber(SELECTORS.requiredMinutes),
  };
}

// ====================================================
// UTILS
// ====================================================

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" bulunamadı (timeout: ${timeout}ms)`));
    }, timeout);
  });
}

// ====================================================
// VISUAL FEEDBACK
// ====================================================

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#4CAF50' : '#F44336'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: system-ui;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `Denetron İSG Bot: ${message}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ====================================================
// AUTO RUN
// ====================================================

async function init() {
  console.log('🚀 İSG-KATİP Scraper başlatılıyor...');
  
  // İşyeri listesi sayfasında mıyız?
  if (!window.location.href.includes('/Isyeri/IsyeriListesi')) {
    console.log('ℹ️ İşyeri listesi sayfasında değiliz');
    return;
  }
  
  console.log('✅ İşyeri listesi sayfasındasınız');
  
  // Otomatik senkronizasyon aktif mi?
  if (!CONFIG.autoSync) {
    console.log('ℹ️ Otomatik senkronizasyon kapalı. Manuel başlatmak için: window.scrapeISGKatip()');
    return;
  }
  
  // Sayfanın tamamen yüklenmesini bekle
  await new Promise(resolve => setTimeout(resolve, CONFIG.minDelay));
  
  try {
    showNotification('Veriler toplanıyor...', 'info');
    const companies = await scrapeCompanies();
    showNotification(`${companies.length} işyeri verisi Denetron'a aktarılıyor...`);
  } catch (error) {
    console.error('❌ Scraping hatası:', error);
    showNotification('Veri toplama hatası!', 'error');
  }
}

// Sayfa yüklendiğinde çalıştır
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Manuel çalıştırma için global fonksiyon
window.scrapeISGKatip = scrapeCompanies;

console.log('💡 İpucu: Manuel başlatmak için console\'da "scrapeISGKatip()" yazın');