// ====================================================
// AUTO-CONFIG - EXTENSION İLK YÜKLENDİĞİNDE ÇALIŞIR
// ====================================================

const AUTO_CONFIG = {
  enabled: true, // false yap kullanıcıların manuel girmesini istersen

  // ⚠️ BU BİLGİLERİ KENDİ SUPABASE BİLGİLERİNLE DEĞİŞTİR
  supabaseUrl: 'https://elmdzekyyoepdrnfppn.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWR6ZWt5eW9lcGRycG5mcHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzcxNDIsImV4cCI6MjA4NzYxMzE0Mn0.IktoIuRqLLNocr6IOyux4N8RSaxCMF8Gs3WHW1tDl8A', // GERÇEK KEY BURAYA
  defaultOrgId: 'b3d557c8-78d1-46f8-a804-273833817f89', // Kendi org ID'n
};

// ====================================================
// INSTALL HANDLER
// ====================================================
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('📦 Extension event:', details.reason);

  if (details.reason === 'install' && AUTO_CONFIG.enabled) {
    console.log('🎉 Extension ilk kez yüklendi!');
    console.log('🔧 Auto-config enjekte ediliyor...');

    try {
      await chrome.storage.local.set({
        supabaseUrl: AUTO_CONFIG.supabaseUrl,
        supabaseKey: AUTO_CONFIG.supabaseKey,
        orgId: AUTO_CONFIG.defaultOrgId,
        autoConfigured: true,
        configuredAt: new Date().toISOString(),
      });

      console.log('✅ Auto-config başarıyla tamamlandı');

      // Open welcome page
      chrome.tabs.create({
        url: chrome.runtime.getURL('welcome.html'),
      });
    } catch (error) {
      console.error('❌ Auto-config error:', error);
    }
  } else if (details.reason === 'update') {
    console.log('🔄 Extension güncellendi');
  }
});

console.log('🟢 Config script loaded');