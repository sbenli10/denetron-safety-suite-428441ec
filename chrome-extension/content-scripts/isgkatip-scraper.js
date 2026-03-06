// chrome-extension/content-scripts/isgkatip-scraper.js

// ====================================================
// İSG-KATİP SCRAPER - GERÇEK YAPIYLA TAM UYUMLU
// ====================================================

console.log('🔍 İSG-KATİP Scraper başlatıldı');

// Config
const CONFIG = {
  minDelay: 2000,
  autoSync: true,
  debug: true,
};

// ====================================================
// GERÇEK SELECTOR'LAR
// ====================================================

const SELECTORS = {
  table: 'table',
  rows: 'table tbody tr',
};

// Kolon index'leri (0-based)
const COLUMNS = {
  contractId: 0,          // Sözleşme ID
  contractName: 1,        // Sözleşme Adı
  contractType: 2,        // Kısmi/Tam Süreli
  duration: 3,            // Çalışma Süresi (dk/ay)
  period: 4,              // Aylık/Yıllık
  startDate: 5,           // Başlangıç Tarihi
  companyName: 20,        // ✅ GERÇEK FİRMA ADI
  sgkNo: 21,              // ✅ SGK İŞYERİ SİCİL NO
  employeeCount: 23,      // ✅ ÇALIŞAN SAYISI
  hazardClass: 24,        // ✅ TEHLİKE SINIFI
  naceCode: 25,           // ✅ NACE KODU
};

// ====================================================
// MESSAGE LISTENER (MANUEL TRIGGER)
// ====================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_MANUAL_SCRAPE') {
    console.log('🔄 Manuel scrape tetiklendi');

    const isLoggedIn = checkIfLoggedIn();

    if (!isLoggedIn) {
      showLoginPrompt();
      sendResponse({ success: false, reason: 'not_logged_in' });
      return;
    }

    const hasTable = document.querySelector(SELECTORS.table);
    
    if (!hasTable) {
      showNoDataPrompt();
      sendResponse({ success: false, reason: 'no_table' });
      return;
    }

    scrapeCompanies()
      .then((companies) => {
        sendResponse({ success: true, count: companies.length });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
  }

  return true; // Async response
});

// ====================================================
// LOGIN KONTROLÜ
// ====================================================

function checkIfLoggedIn() {
  // Kullanıcı adı var mı kontrol et
  const userNameElements = document.querySelectorAll('[class*="user"], [class*="kullanici"]');
  
  for (const el of userNameElements) {
    const text = el.textContent.trim();
    if (text.length > 0 && !text.includes('Giriş')) {
      console.log('✅ Kullanıcı tespit edildi:', text);
      return true;
    }
  }
  
  // Çıkış butonu var mı?
  const logoutBtn = document.querySelector('a[href*="logout"], a[href*="cikis"]');
  if (logoutBtn) return true;
  
  // Login formu var mı? (varsa giriş yapılmamış)
  const loginForm = document.querySelector('form[action*="login"], #loginForm');
  if (loginForm) return false;
  
  // URL kontrol
  if (window.location.href.includes('/login') || window.location.href.includes('/giris')) {
    return false;
  }
  
  // Varsayılan: Sayfa yüklendiyse muhtemelen giriş yapılmış
  console.log('✅ Login durumu: muhtemelen giriş yapılmış');
  return true;
}

// ====================================================
// SCRAPE COMPANIES
// ====================================================

async function scrapeCompanies() {
  console.log('📊 İşyeri verilerini topluyorum...');
  
  try {
    // Sayfa yüklenmesini bekle
    await waitForElement(SELECTORS.table);
    
    const companies = [];
    const rows = document.querySelectorAll(SELECTORS.rows);
    
    console.log(`📋 ${rows.length} sözleşme satırı bulundu`);
    
    if (rows.length === 0) {
      throw new Error('Hiç sözleşme satırı bulunamadı');
    }
    
    rows.forEach((row, index) => {
      try {
        const company = extractCompanyData(row);
        
        // Firma adı ve SGK no varsa ekle
        if (company.company_name && company.sgk_no) {
          companies.push(company);
          
          if (CONFIG.debug && index < 5) {
            console.log(`✅ ${index + 1}. ${company.company_name} - ${company.employee_count} çalışan`);
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
          totalRows: rows.length,
        },
      });
    } else {
      throw new Error('Hiç işyeri verisi parse edilemedi');
    }
    
    return companies;
    
  } catch (error) {
    console.error('❌ Scraping hatası:', error);
    showNotification(`Hata: ${error.message}`, 'error');
    throw error;
  }
}

// ====================================================
// EXTRACT COMPANY DATA
// ====================================================

function extractCompanyData(row) {
  const cells = row.querySelectorAll('td');
  
  if (cells.length < 26) {
    throw new Error(`Yetersiz kolon: ${cells.length}`);
  }
  
  const getText = (index) => {
    return cells[index] ? cells[index].textContent.trim() : '';
  };
  
  const getNumber = (index) => {
    const text = getText(index);
    const num = parseInt(text.replace(/\D/g, ''));
    return isNaN(num) ? 0 : num;
  };
  
  return {
    // Temel bilgiler
    sgk_no: getText(COLUMNS.sgkNo),
    company_name: getText(COLUMNS.companyName),
    employee_count: getNumber(COLUMNS.employeeCount),
    hazard_class: getText(COLUMNS.hazardClass) || 'Az Tehlikeli',
    nace_code: getText(COLUMNS.naceCode),
    
    // Sözleşme bilgileri
    contract_id: getText(COLUMNS.contractId),
    contract_name: getText(COLUMNS.contractName),
    contract_type: getText(COLUMNS.contractType),
    contract_start: getText(COLUMNS.startDate),
    
    // Çalışma bilgileri
    assigned_minutes: getNumber(COLUMNS.duration),
    period: getText(COLUMNS.period),
    
    // Hesaplanan değerler
    required_minutes: calculateRequiredMinutes(
      getNumber(COLUMNS.employeeCount),
      getText(COLUMNS.hazardClass)
    ),
  };
}

// ====================================================
// CALCULATE REQUIRED MINUTES
// ====================================================

function calculateRequiredMinutes(employeeCount, hazardClass) {
  // İSG mevzuatına göre gerekli süre hesaplama
  
  let minutesPerEmployee = 10; // Varsayılan (Az Tehlikeli)
  
  if (hazardClass.includes('Çok Tehlikeli')) {
    minutesPerEmployee = 30;
  } else if (hazardClass.includes('Tehlikeli')) {
    minutesPerEmployee = 20;
  }
  
  return employeeCount * minutesPerEmployee;
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
  const colors = {
    success: '#4CAF50',
    error: '#F44336',
    info: '#2196F3',
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${colors[type] || colors.info};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui;
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `Denetron İSG Bot: ${message}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function showLoginPrompt() {
  const prompt = document.createElement('div');
  prompt.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    text-align: center;
    font-family: system-ui;
  `;

  prompt.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    </div>
    <h2 style="margin: 0 0 0.5rem 0; color: #1f2937;">Denetron İSG Bot</h2>
    <p style="margin: 0 0 1.5rem 0; color: #6b7280; font-size: 14px;">
      Verileri çekmek için lütfen İSG-KATİP'e giriş yapın.
    </p>
    <button id="denetron-dismiss" style="
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    ">
      Tamam
    </button>
  `;

  document.body.appendChild(prompt);

  document.getElementById('denetron-dismiss')?.addEventListener('click', () => {
    prompt.remove();
  });
}

function showNoDataPrompt() {
  showNotification('Bu sayfada sözleşme tablosu bulunamadı. Lütfen "Kişi/Kurum Kartı Bilgileri" sayfasına gidin.', 'error');
}

// CSS animasyonları
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ====================================================
// AUTO RUN
// ====================================================

// chrome-extension/content-scripts/isgkatip-scraper.js

// ====================================================
// DOĞRU URL KONTROLÜ
// ====================================================

async function init() {
  console.log('🚀 İSG-KATİP Scraper başlatılıyor...');
  
  // Login kontrolü
  const isLoggedIn = checkIfLoggedIn();
  
  if (!isLoggedIn) {
    console.warn('⚠️ Kullanıcı giriş yapmamış');
    showLoginPrompt();
    return;
  }
  
  console.log('✅ Kullanıcı giriş yapmış');
  
  // ✅ DOĞRU URL: /kisi-kurum/kisi-karti/kisi-kartim
  const isCorrectPage = window.location.href.includes('/kisi-kurum/kisi-karti/kisi-kartim');
  
  if (!isCorrectPage) {
    console.log('ℹ️ Kişi kartı sayfasında değiliz');
    showNavigationPrompt();
    return;
  }
  
  console.log('✅ Kişi kartı sayfasındasınız');
  
  // Tablo var mı?
  const hasTable = document.querySelector(SELECTORS.table);
  
  if (!hasTable) {
    console.log('ℹ️ Bu sayfada sözleşme tablosu yok');
    return;
  }
  
  console.log('✅ Sözleşme tablosu bulundu');
  
  // Otomatik senkronizasyon aktif mi?
  if (!CONFIG.autoSync) {
    console.log('ℹ️ Otomatik senkronizasyon kapalı');
    return;
  }
  
  // Sayfanın tamamen yüklenmesini bekle
  await new Promise(resolve => setTimeout(resolve, CONFIG.minDelay));
  
  try {
    showNotification('Sözleşmeler toplanıyor...', 'info');
    const companies = await scrapeCompanies();
    showNotification(`✅ ${companies.length} işyeri verisi Denetron'a aktarılıyor...`, 'success');
  } catch (error) {
    console.error('❌ Scraping hatası:', error);
    showNotification(`Veri toplama hatası: ${error.message}`, 'error');
  }
}

// ====================================================
// NAVIGATION PROMPT (DOĞRU URL İLE)
// ====================================================

function showNavigationPrompt() {
  const prompt = document.createElement('div');
  prompt.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(59, 130, 246, 0.3);
    z-index: 10000;
    max-width: 350px;
    font-family: system-ui;
    animation: slideIn 0.3s ease-out;
  `;

  prompt.innerHTML = `
    <div style="margin-bottom: 0.75rem; font-weight: 600; font-size: 14px;">
      💡 Denetron İSG Bot
    </div>
    <div style="margin-bottom: 1rem; font-size: 13px; line-height: 1.5;">
      Verileri otomatik çekmek için <strong>Kişi Kartı Bilgileri</strong> sayfasına gidin.
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button id="denetron-goto-list" style="
        flex: 1;
        padding: 0.5rem;
        background: white;
        color: #3b82f6;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      ">
        Kişi Kartına Git
      </button>
      <button id="denetron-dismiss-nav" style="
        padding: 0.5rem 1rem;
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
      ">
        Kapat
      </button>
    </div>
  `;

  document.body.appendChild(prompt);

  // ✅ DOĞRU URL'E YÖNLENDİR
  document.getElementById('denetron-goto-list')?.addEventListener('click', () => {
    window.location.href = 'https://isgkatip.csgb.gov.tr/kisi-kurum/kisi-karti/kisi-kartim';
  });

  document.getElementById('denetron-dismiss-nav')?.addEventListener('click', () => {
    prompt.remove();
  });

  setTimeout(() => {
    if (document.body.contains(prompt)) {
      prompt.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => prompt.remove(), 300);
    }
  }, 10000);
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