// chrome-extension/content-scripts/isgkatip-scraper.js

// ====================================================
// İSG-KATİP SCRAPER
// ====================================================

console.log("🔍 İSG-KATİP Scraper başlatıldı");

const CONFIG = {
  minDelay: 1200,
  autoSync: false,
  debug: true,
  pendingSyncKey: "pendingIsgkatipManualSync",
};

const SELECTORS = {
  table: "table",
  rows: "table tbody tr",
};

let isScraping = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDate(raw = "") {
  const text = normalizeText(raw);
  const ddmmyyyy = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;

  const yyyymmdd = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) return yyyymmdd[0];

  return null;
}

function parseNumber(raw = "") {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const value = parseInt(digits, 10);
  return Number.isNaN(value) ? 0 : value;
}

function parseHazardClass(rowText, fallback = "Az Tehlikeli") {
  const lower = rowText.toLowerCase();
  if (lower.includes("çok tehlikeli") || lower.includes("cok tehlikeli")) return "Çok Tehlikeli";
  if (lower.includes("tehlikeli")) return "Tehlikeli";
  if (lower.includes("az tehlikeli")) return "Az Tehlikeli";
  return fallback;
}

function extractCompanyData(row) {
  const cells = Array.from(row.querySelectorAll("td"));
  if (cells.length < 2) {
    return null;
  }

  const values = cells.map((cell) => normalizeText(cell.textContent || ""));
  const fullText = values.join(" ");

  const companyName = values[0] || "";
  const sgkCandidate = values.find((v) => /\d{8,}/.test(v)) || values[1] || "";
  const sgkNo = (sgkCandidate.match(/\d{8,}/)?.[0] || "").replace(/\D/g, "");

  if (!companyName || !sgkNo) {
    return null;
  }

  const employeeCount = parseNumber(values[2] || "");
  const hazardClass = parseHazardClass(fullText);

  const dateValues = values.map((v) => normalizeDate(v)).filter(Boolean);
  const contractStart = dateValues[0] || null;
  const contractEnd = dateValues[1] || null;

  const minuteCandidates = values.map(parseNumber).filter((n) => n > 0);
  const assignedMinutes = minuteCandidates[minuteCandidates.length - 2] || 0;
  const requiredMinutes = minuteCandidates[minuteCandidates.length - 1] || 0;

  return {
    company_name: companyName,
    sgk_no: sgkNo,
    employee_count: employeeCount,
    hazard_class: hazardClass,
    nace_code: "",
    contract_start: contractStart,
    contract_end: contractEnd,
    assigned_minutes: assignedMinutes,
    required_minutes: requiredMinutes,
  };
}

async function waitForElement(selector, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element bulunamadı: ${selector}`));
    }, timeout);
  });
}

function showNotification(message, type = "success") {
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    info: "#2563eb",
  };

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    background: ${colors[type] || colors.success};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui;
    font-size: 13px;
  `;
  notification.textContent = `Denetron İSG Bot: ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3500);
}

async function scrapeCompanies() {
  if (isScraping) {
    console.log("ℹ️ Scrape zaten devam ediyor");
    return [];
  }

  isScraping = true;

  try {
    if (!window.location.href.includes("/Isyeri/IsyeriListesi")) {
      throw new Error("Lütfen İşyeri Listesi sayfasını açın");
    }

    await waitForElement(SELECTORS.table);
    await sleep(CONFIG.minDelay);

    const rows = Array.from(document.querySelectorAll(SELECTORS.rows));
    if (rows.length === 0) {
      throw new Error("Tabloda işyeri satırı bulunamadı");
    }

    const companies = [];
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      const company = extractCompanyData(row);
      if (!company) {
        skipped += 1;
        continue;
      }

      companies.push(company);
      if (CONFIG.debug) {
        console.log(`✅ ${index + 1}. ${company.company_name} - ${company.sgk_no}`);
      }
    }

    if (companies.length === 0) {
      throw new Error("Hiç işyeri verisi parse edilemedi");
    }

    await chrome.runtime.sendMessage({
      type: "ISGKATIP_COMPANIES_SCRAPED",
      data: companies,
      metadata: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        totalFound: companies.length,
        skippedRows: skipped,
      },
    });

    showNotification(`${companies.length} işyeri Denetron'a gönderildi`, "success");
    return companies;
  } catch (error) {
    console.error("❌ Scraping hatası:", error);
    showNotification(error.message || "Veriler alınamadı", "error");
    throw error;
  } finally {
    isScraping = false;
    await chrome.storage.local.remove(CONFIG.pendingSyncKey);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRIGGER_MANUAL_SCRAPE") {
    scrapeCompanies()
      .then((companies) => sendResponse({ success: true, total: companies.length }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

async function init() {
  console.log("🚀 İSG-KATİP Scraper hazır");

  if (!window.location.href.includes("/Isyeri/IsyeriListesi")) {
    return;
  }

  if (CONFIG.autoSync) {
    await scrapeCompanies();
    return;
  }

  const syncState = await chrome.storage.local.get(CONFIG.pendingSyncKey);
  if (syncState[CONFIG.pendingSyncKey]) {
    console.log("📥 Bekleyen manuel senkronizasyon bulundu");
    await scrapeCompanies();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.scrapeISGKatip = scrapeCompanies;
