// chrome-extension/content-scripts/isgkatip-scraper.js

// ====================================================
// İSG-KATİP SCRAPER - HER ZAMAN AKTİF BUTON
// ====================================================

console.log('🔍 İSG-KATİP Scraper başlatıldı');

// Config
const CONFIG = {
  minDelay: 2000,
  debug: true,
};

// Selector'lar
const SELECTORS = {
  table: 'table',
  rows: 'table tbody tr',
};

// Kolon index'leri
const COLUMNS = {
  contractId: 0,
  contractName: 1,
  contractType: 2,
  duration: 3,
  period: 4,
  startDate: 5,
  companyName: 20,
  sgkNo: 21,
  employeeCount: 23,
  hazardClass: 24,
  naceCode: 25,
};

// ====================================================
// INIT
// ====================================================

async function init() {
  console.log('🚀 İSG-KATİP Scraper başlatılıyor...');
  
  // Login kontrolü
  const isLoggedIn = checkIfLoggedIn();
  
  if (!isLoggedIn) {
    console.warn('⚠️ Kullanıcı giriş yapmamış');
    return;
  }
  
  console.log('✅ Kullanıcı giriş yapmış');
  
  // Kişi kartı sayfasında mıyız?
  const isCorrectPage = window.location.href.includes('/kisi-kurum/kisi-karti/kisi-kartim');
  
  if (!isCorrectPage) {
    console.log('ℹ️ Kişi kartı sayfasında değiliz');
    return;
  }
  
  console.log('✅ Kişi kartı sayfasındasınız');
  
  // Sayfa yüklenmesini bekle
  await new Promise(resolve => setTimeout(resolve, CONFIG.minDelay));
  
  // ✅ İSG HİZMET SÖZLEŞMELERİ TAB'INA TIKLA
  const tabClicked = await clickISGTab();
  
  if (!tabClicked) {
    console.warn('⚠️ İSG Hizmet Sözleşmeleri tab bulunamadı');
    showTabNotFoundPrompt();
    
    // Tab bulunamasa bile butonu göster (manuel açabilir)
    showTransferButton();
    return;
  }
  
  console.log('✅ İSG Hizmet Sözleşmeleri tab açıldı');
  
  // Tab'ın yüklenmesini bekle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Tablo var mı kontrol et
  const table = document.querySelector(SELECTORS.table);
  
  if (!table) {
    console.warn('⚠️ Tablo bulunamadı, yine de buton gösteriliyor');
  } else {
    const rows = document.querySelectorAll(SELECTORS.rows);
    console.log(`✅ Tablo bulundu: ${rows.length} satır`);
  }
  
  // ✅ HER ZAMAN BUTONU GÖSTER
  showTransferButton();
}

// ====================================================
// İSG TAB'INA TIKLA
// ====================================================

async function clickISGTab() {
  console.log('🔍 İSG Hizmet Sözleşmeleri tab aranıyor...');
  
  const allTabs = document.querySelectorAll('a, button, [role="tab"], .tab-item');
  
  for (const tab of allTabs) {
    const text = tab.textContent.trim();
    
    if (
      text.includes('İSG Hizmet Sözleşmeleri') ||
      text.includes('İSG Hizmet') ||
      (text.includes('İSG') && text.includes('Sözleşme'))
    ) {
      console.log('✅ İSG tab bulundu:', text);
      
      tab.click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return true;
    }
  }
  
  console.error('❌ İSG tab bulunamadı');
  return false;
}

// ====================================================
// VERİLERİ AKTAR BUTONU GÖSTER
// ====================================================

function showTransferButton() {
  // Zaten varsa gösterme
  if (document.getElementById('denetron-transfer-btn')) {
    console.log('ℹ️ Transfer butonu zaten var');
    return;
  }
  
  console.log('🔘 Verileri Aktar butonu oluşturuluyor...');
  
  const button = document.createElement('button');
  button.id = 'denetron-transfer-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    <span>Verileri Denetron'a Aktar</span>
  `;
  
  button.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
    cursor: pointer;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 600;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
    animation: slideInUp 0.5s ease-out;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-3px)';
    button.style.boxShadow = '0 15px 50px rgba(102, 126, 234, 0.5)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.4)';
  });
  
  button.addEventListener('click', async () => {
    await handleTransfer(button);
  });
  
  document.body.appendChild(button);
  console.log('✅ Verileri Aktar butonu eklendi');
}

// ====================================================
// VERİ TRANSFER İŞLEMİ
// ====================================================

async function handleTransfer(button) {
  console.log('🔄 Veri transferi başlatılıyor...');
  
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.style.opacity = '0.7';
  button.style.cursor = 'not-allowed';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    <span>Veriler aktarılıyor...</span>
  `;
  
  try {
    showNotification('Veriler toplanıyor...', 'info');
    const companies = await scrapeCompanies();
    
    if (companies.length === 0) {
      throw new Error('Hiç işyeri verisi bulunamadı');
    }
    
    showNotification(`${companies.length} işyeri bulundu, Denetron'a aktarılıyor...`, 'info');
    
    chrome.runtime.sendMessage({
      type: 'ISGKATIP_COMPANIES_SCRAPED',
      data: companies,
      metadata: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        totalFound: companies.length,
      },
    });
    
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>✅ ${companies.length} işyeri aktarıldı!</span>
    `;
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    
    showNotification(`✅ ${companies.length} işyeri başarıyla aktarıldı!`, 'success');
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }, 3000);
    
  } catch (error) {
    console.error('❌ Transfer hatası:', error);
    
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>❌ Hata oluştu</span>
    `;
    button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    
    showNotification(`Hata: ${error.message}`, 'error');
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }, 3000);
  }
}

// ====================================================
// SCRAPE COMPANIES
// ====================================================

async function scrapeCompanies() {
  console.log('📊 İşyeri verilerini topluyorum...');
  
  const companies = [];
  const rows = document.querySelectorAll(SELECTORS.rows);
  
  console.log(`📋 ${rows.length} sözleşme satırı bulundu`);
  
  if (rows.length === 0) {
    throw new Error('Hiç sözleşme satırı bulunamadı. Lütfen "İSG Hizmet Sözleşmeleri Bilgileri" tab\'ına gidin.');
  }
  
  rows.forEach((row, index) => {
    try {
      const company = extractCompanyData(row);
      
      if (company.company_name && company.sgk_no) {
        companies.push(company);
        
        if (CONFIG.debug && index < 5) {
          console.log(`✅ ${index + 1}. ${company.company_name}`);
        }
      }
    } catch (error) {
      if (CONFIG.debug) {
        console.error(`❌ Satır ${index + 1} parse hatası:`, error.message);
      }
    }
  });
  
  console.log(`📦 Toplam ${companies.length} işyeri başarıyla işlendi`);
  
  if (companies.length === 0) {
    throw new Error('Hiç işyeri verisi parse edilemedi. Lütfen "İSG Hizmet Sözleşmeleri Bilgileri" tab\'ında olduğunuzdan emin olun.');
  }
  
  return companies;
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
  
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    
    const [, day, month, year, hour, minute, second] = match;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  };
  
  return {
    sgk_no: getText(COLUMNS.sgkNo),
    company_name: getText(COLUMNS.companyName),
    employee_count: getNumber(COLUMNS.employeeCount),
    hazard_class: getText(COLUMNS.hazardClass) || 'Az Tehlikeli',
    nace_code: getText(COLUMNS.naceCode),
    contract_id: getText(COLUMNS.contractId),
    contract_name: getText(COLUMNS.contractName),
    contract_type: getText(COLUMNS.contractType),
    contract_start: parseDate(getText(COLUMNS.startDate)),
    assigned_minutes: getNumber(COLUMNS.duration),
    period: getText(COLUMNS.period),
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
  let minutesPerEmployee = 10;
  
  if (hazardClass.includes('Çok Tehlikeli')) {
    minutesPerEmployee = 30;
  } else if (hazardClass.includes('Tehlikeli')) {
    minutesPerEmployee = 20;
  }
  
  return employeeCount * minutesPerEmployee;
}

// ====================================================
// LOGIN KONTROLÜ
// ====================================================

function checkIfLoggedIn() {
  const userElements = document.querySelectorAll('[class*="user"], [class*="kullanici"]');
  
  for (const el of userElements) {
    const text = el.textContent.trim();
    if (text.length > 0 && !text.includes('Giriş')) {
      return true;
    }
  }
  
  if (document.querySelector('a[href*="logout"], a[href*="cikis"]')) {
    return true;
  }
  
  if (document.querySelector('form[action*="login"], #loginForm')) {
    return false;
  }
  
  if (window.location.href.includes('/login') || window.location.href.includes('/giris')) {
    return false;
  }
  
  return true;
}

// ====================================================
// NOTIFICATION
// ====================================================

function showNotification(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${colors[type]};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: system-ui;
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `Denetron: ${message}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function showTabNotFoundPrompt() {
  showNotification('İSG Hizmet Sözleşmeleri tab\'ı bulunamadı. Manuel olarak tıklayın, buton aktif kalacak.', 'info');
}

// ====================================================
// CSS ANIMATIONS
// ====================================================

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  
  @keyframes slideInUp {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// ====================================================
// START
// ====================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('💡 İSG-KATİP Scraper hazır');