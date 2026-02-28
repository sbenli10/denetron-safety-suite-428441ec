import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addInterFontsToJsPDF } from "./fonts";
import type { ADEPData } from "@/types/adep";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Satır 10 civarı
export async function generateADEPPDF(data: ADEPData): Promise<Blob> {
  const doc = new (jsPDF as any)({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  
  // ✅ Inter fontlarını yükle
  addInterFontsToJsPDF(doc);
  doc.setFont("Inter", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ========================
  // HELPER FUNCTIONS
  // ========================
  
  const addPageNumber = (pageNum: number, total: number) => {
    doc.setFont("Inter", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sayfa ${pageNum} / ${total}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
    doc.text(
      `DENETRON İSG © ${new Date().getFullYear()}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `Belge No: ADEP-${new Date().getTime().toString().slice(-8)}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  const addHeader = (title: string, subtitle?: string) => {
    // Gradient background
    doc.setFillColor(220, 38, 38); // Red-600
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Pattern overlay
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    for (let i = 0; i < pageWidth; i += 5) {
      doc.line(i, 0, i + 20, 50);
    }

    // Logo placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 15, 20, 20, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.setFont("Inter", "bold");
    doc.text("İSG", margin + 10, 27, { align: 'center' });

    // Title
    doc.setFont("Inter", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 25, 25);

    if (subtitle) {
      doc.setFont("Inter", "normal");
      doc.setFontSize(10);
      doc.text(subtitle, margin + 25, 35);
    }
  };

  const addSectionTitle = (y: number, title: string, icon?: string): number => {
    doc.setFillColor(239, 246, 255); // Blue-50
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    
    doc.setFont("Inter", "bold");
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216); // Blue-700
    doc.text(`${icon || '•'} ${title}`, margin + 5, y + 8);
    
    return y + 15;
  };

  const addInfoBox = (y: number, title: string, content: string, type: 'info' | 'warning' | 'success' | 'danger' = 'info'): number => {
    const colors = {
      info: { bg: [219, 234, 254], border: [59, 130, 246], text: [30, 64, 175] },
      warning: { bg: [254, 243, 199], border: [245, 158, 11], text: [146, 64, 14] },
      success: { bg: [220, 252, 231], border: [34, 197, 94], text: [22, 101, 52] },
      danger: { bg: [254, 226, 226], border: [239, 68, 68], text: [153, 27, 27] }
    };

    const color = colors[type];
    
    doc.setFillColor(...color.bg);
    doc.setDrawColor(...color.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'FD');

    doc.setFont("Inter", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...color.text);
    doc.text(title, margin + 5, y + 7);

    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(content, contentWidth - 10);
    doc.text(lines, margin + 5, y + 13);

    return y + 30;
  };

  // ========================
  // KAPAK SAYFASI
  // ========================
  
  // Background gradient
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, pageHeight / 2, 'F');
  
  doc.setFillColor(239, 68, 68);
  doc.rect(0, pageHeight / 2, pageWidth, pageHeight / 2, 'F');

  // Decorative circles
  doc.setFillColor(255, 255, 255);
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 30, 40, 60, 'F');
  doc.circle(30, pageHeight - 40, 80, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Logo
  if (data.company_info.logo_url) {
    try {
      doc.addImage(data.company_info.logo_url, 'PNG', pageWidth / 2 - 25, 40, 50, 50);
    } catch (e) {
      // Fallback logo
      doc.setFillColor(255, 255, 255);
      doc.circle(pageWidth / 2, 65, 30, 'F');
      doc.setFontSize(24);
      doc.setTextColor(220, 38, 38);
      doc.setFont("Inter", "bold");
      doc.text("İSG", pageWidth / 2, 70, { align: 'center' });
    }
  }

  // Main title
  doc.setFont("Inter", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text("ACİL DURUM", pageWidth / 2, 120, { align: 'center' });
  doc.text("EYLEM PLANI", pageWidth / 2, 135, { align: 'center' });

  // Company name box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 155, contentWidth, 20, 3, 3, 'F');
  doc.setFont("Inter", "bold");
  doc.setFontSize(18);
  doc.setTextColor(220, 38, 38);
  doc.text(data.company_info.firma_adi.toUpperCase(), pageWidth / 2, 168, { align: 'center' });

  // Compliance badge
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1);
  doc.roundedRect(margin, 185, contentWidth, 15, 3, 3, 'FD');
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text(
    "📜 6331 Sayılı İSG Kanunu Md. 11 ve Acil Durumlar Yönetmeliği'ne Uygun",
    pageWidth / 2,
    193,
    { align: 'center' }
  );


  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);


  let metaY = 205; 
  const lineSpacing = 7;

  doc.text(`📅 Hazırlanma Tarihi: ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}`, pageWidth / 2, metaY, { align: 'center' });
  doc.text(`🔄 Gözden Geçirme: ${format(new Date(data.next_review_date), 'dd.MM.yyyy')}`, pageWidth / 2, metaY + (lineSpacing * 3), { align: 'center' });

  // --- QR Code Bölümü ---
  if (data.qr_code) {
      try {
          const qrSize = 32; // QR kod boyutunu bir tık küçülttük (35 -> 32)
          // QR kodun y koordinatını, metinlerin bittiği yerin altına sabitledik
          const qrY = metaY + (lineSpacing * 4) + 5; 
          
          // QR Kodun arkasına beyaz yuvarlatılmış bir kutu ekleyerek okunabilirliği artırıyoruz
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(
              pageWidth / 2 - (qrSize / 2 + 3), 
              qrY - 3, 
              qrSize + 6, 
              qrSize + 6, 
              3, 3, 'F'
          );
          
          doc.addImage(
              data.qr_code, 
              'PNG', 
              pageWidth / 2 - qrSize / 2, 
              qrY, 
              qrSize, 
              qrSize
          );
          
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text("Dijital erişim için QR kodu okutun", pageWidth / 2, qrY + qrSize + 8, { align: 'center' });
      } catch (e) {
          console.warn("QR kod eklenemedi:", e);
      }
  }
  doc.addPage();
  addHeader("BELİRLEYİCİ BİLGİLER", "Plan Kimliği ve Onay Bilgileri");

  let y = 60;

  const docInfo = [
    ["Belge No", `ADEP-${new Date().getTime().toString().slice(-8)}`],
    ["Yürürlük Tarihi", format(new Date(), 'dd.MM.yyyy')],
    ["Geçerlilik Süresi", "1 Yıl"],
    ["Sonraki Gözden Geçirme", format(new Date(data.next_review_date), 'dd.MM.yyyy')],
    ["Hazırlayan", data.created_by],
  ];

  autoTable(doc, {
    startY: y,
    head: [['BİLGİ', 'DEĞER']],
    body: docInfo,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 10,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        fillColor: [248, 250, 252],
        cellWidth: 70
      },
      1: { 
        fillColor: [255, 255, 255],
        cellWidth: 110
      }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // İmza alanları
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, contentWidth, 60, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth / 2 - 5, 60);
  doc.rect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 60);

  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text("HAZIRLAYAN", margin + contentWidth / 4, y + 10, { align: 'center' });
  doc.text("ONAYLAYAN", margin + 3 * contentWidth / 4, y + 10, { align: 'center' });

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.text(data.created_by, margin + contentWidth / 4, y + 45, { align: 'center' });
  doc.text(data.company_info.yetkili_kisi, margin + 3 * contentWidth / 4, y + 45, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("İmza ve Tarih", margin + contentWidth / 4, y + 52, { align: 'center' });
  doc.text("İmza ve Tarih", margin + 3 * contentWidth / 4, y + 52, { align: 'center' });

  // ========================
  // SAYFA 3: İÇİNDEKİLER
  // ========================
  doc.addPage();
  addHeader("İÇİNDEKİLER", "Plan Kapsamı");

  y = 60;
  y = addSectionTitle(y, "Plan İçeriği", "📑");

  const tocItems = [
    { num: "1", title: "Belirleyici Bilgiler", page: "2" },
    { num: "2", title: "İşyeri Tanıtım Bilgileri", page: "4" },
    { num: "3", title: "Acil Durum Ekipleri", page: "5" },
    { num: "3.1", title: "  • Söndürme Ekibi", page: "5", indent: true },
    { num: "3.2", title: "  • Arama-Kurtarma Ekibi", page: "6", indent: true },
    { num: "3.3", title: "  • Koruma Ekibi", page: "7", indent: true },
    { num: "3.4", title: "  • İlk Yardım Ekibi", page: "8", indent: true },
    { num: "4", title: "Acil Durum Senaryoları ve Prosedürler", page: "9" },
    ...data.scenarios.filter(s => s.selected).map((s, i) => ({
      num: `4.${i + 1}`,
      title: `  • ${s.name}`,
      page: `${10 + i}`,
      indent: true
    })),
    { num: "5", title: "Tahliye Planı ve Kroki", page: `${10 + data.scenarios.filter(s => s.selected).length}` },
    { num: "6", title: "Acil İletişim Bilgileri", page: `${11 + data.scenarios.filter(s => s.selected).length}` },
    { num: "7", title: "Tatbikat Takvimi", page: `${12 + data.scenarios.filter(s => s.selected).length}` },
    { num: "EK-1", title: "Yapay Zeka Teknik Denetim Raporu", page: `${13 + data.scenarios.filter(s => s.selected).length}` }
  ];

  autoTable(doc, {
    startY: y,
    body: tocItems.map(item => [
      item.num,
      item.title,
      item.page
    ]),
    theme: 'plain',
    styles: {
      font: "Inter",
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { 
        cellWidth: 20,
        fontStyle: 'bold',
        textColor: [220, 38, 38]
      },
      1: { 
        cellWidth: 130,
        textColor: [31, 41, 55]
      },
      2: { 
        cellWidth: 20,
        halign: 'right',
        textColor: [107, 114, 128]
      }
    },
   didParseCell: (data) => {
    const item = tocItems[data.row.index];
    
    // ✅ Çözüm 1: "in" operatörü ile özelliğin varlığını kontrol et
    if (item && 'indent' in item && item.indent) {
      data.cell.styles.textColor = [107, 114, 128];
    }
    
    // Alternatif Çözüm 2 (Daha kısa): any ile cast etme
    // if ((tocItems[data.row.index] as any)?.indent) { ... }
  }
  });

  // ========================
  // SAYFA 4: İŞYERİ TANITIM
  // ========================
  doc.addPage();
  addHeader("İŞYERİ TANITIM BİLGİLERİ", data.company_info.firma_adi);

  y = 60;
  y = addSectionTitle(y, "Genel Bilgiler", "🏢");

  const companyData = [
    ["Firma Ünvanı", data.company_info.firma_adi],
    ["Sektör", data.company_info.sektor || "—"],
    ["Vergi No", data.company_info.vergi_no || "—"],
    ["Adres", data.company_info.adres],
    ["Yetkili Kişi", data.company_info.yetkili_kisi],
    ["Telefon", data.company_info.yetkili_telefon],
    ["E-posta", data.company_info.email || "—"]
  ];

  autoTable(doc, {
    startY: y,
    body: companyData,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        fillColor: [248, 250, 252],
        cellWidth: 60
      },
      1: { 
        fillColor: [255, 255, 255]
      }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 15;
  y = addSectionTitle(y, "İş Sağlığı ve Güvenliği Bilgileri", "⚠️");

  const isgData = [
    ["Tehlike Sınıfı", data.company_info.tehlike_sinifi],
    ["Toplam Çalışan Sayısı", data.company_info.calisan_sayisi.toString()],
    ["Acil Durum Ekip Üyesi", 
      (data.teams.sondurme.length + data.teams.kurtarma.length + 
       data.teams.koruma.length + data.teams.ilk_yardim.length).toString()
    ],
    ["Plan Kapsamındaki Senaryo", data.scenarios.filter(s => s.selected).length.toString()]
  ];

  autoTable(doc, {
    startY: y,
    body: isgData,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        fillColor: [254, 243, 199],
        cellWidth: 60
      },
      1: { 
        fillColor: [255, 255, 255],
        fontStyle: 'bold',
        textColor: [220, 38, 38]
      }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Risk info box
  const riskColor = 
    data.company_info.tehlike_sinifi === "Çok Tehlikeli" ? 'danger' :
    data.company_info.tehlike_sinifi === "Tehlikeli" ? 'warning' : 'success';

  addInfoBox(
    y,
    `${data.company_info.tehlike_sinifi} İşyeri`,
    `Bu işyeri ${data.company_info.tehlike_sinifi.toLowerCase()} sınıfında değerlendirilmiştir. ` +
    `İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği'ne göre gerekli önlemler alınmalıdır.`,
    riskColor
  );

  // ========================
  // SAYFA 5+: EKIP TABLOLARI (GELİŞTİRİLMİŞ)
  // ========================
  const teamConfigs = [
    { 
      key: 'sondurme' as const,
      name: "SÖNDÜRME EKİBİ",
      icon: "🧯",
      color: [220, 38, 38],
      desc: "Yangın söndürme ekipmanlarını kullanarak ilk müdahaleyi yapan, yangının yayılmasını önleyen ekip. " +
            "Ekip üyeleri yangın söndürme eğitimi almış ve söndürücü kullanımı konusunda sertifikalı olmalıdır."
    },
    { 
      key: 'kurtarma' as const,
      name: "ARAMA-KURTARMA EKİBİ",
      icon: "🚑",
      color: [234, 88, 12],
      desc: "Enkaz altında kalan veya tehlikeli bölgelerde mahsur kalmış kişileri kurtaran ekip. " +
            "Ekip üyeleri arama-kurtarma teknikleri ve ilk müdahale konusunda eğitimli olmalıdır."
    },
    { 
      key: 'koruma' as const,
      name: "KORUMA EKİBİ",
      icon: "🛡️",
      color: [34, 197, 94],
      desc: "Tahliye sırasında personeli yönlendiren, güvenlik sağlayan ve toplanma noktalarında yoklama alan ekip. " +
            "Bina yapısını iyi bilmeli ve acil durum prosedürlerine hakimdir."
    },
    { 
      key: 'ilk_yardim' as const,
      name: "İLK YARDIM EKİBİ",
      icon: "🩹",
      color: [59, 130, 246],
      desc: "Yaralılara ilk müdahaleyi yapan, ambulans gelene kadar hayati desteği sağlayan sağlık ekibi. " +
            "Ekip üyeleri geçerli ilk yardım sertifikasına sahip olmalıdır."
    }
  ];

  teamConfigs.forEach((config) => {
    doc.addPage();
    
    // Header with team icon
    doc.setFillColor(...config.color);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setFont("Inter", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(`${config.icon} ${config.name}`, pageWidth / 2, 30, { align: 'center' });

    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(config.desc, contentWidth - 40);
    doc.text(descLines, pageWidth / 2, 42, { align: 'center' });

    y = 70;

    const members = data.teams[config.key];

    if (members.length === 0) {
      y = addInfoBox(
        y,
        "Ekip Üyesi Bulunamadı",
        "Bu ekip için henüz üye atanmamıştır. Lütfen en kısa sürede ekip üyelerini belirleyiniz.",
        'warning'
      );
    } else {
      // Team stats
      const certifiedCount = members.filter(m => m.sertifika).length;
      
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 15, 2, 2, 'F');
      
      doc.setFont("Inter", "bold");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(`Toplam Üye: ${members.length}`, margin + 5, y + 10);
      doc.text(`Sertifikalı: ${certifiedCount}`, pageWidth / 2, y + 10, { align: 'center' });
      doc.text(`Sertifikasız: ${members.length - certifiedCount}`, pageWidth - margin - 5, y + 10, { align: 'right' });

      y += 20;

      // Member table
      const teamData = members.map((member, idx) => [
        (idx + 1).toString(),
        member.ad_soyad,
        member.gorev,
        member.telefon,
        member.email || "—",
        member.sertifika || "—",
        member.egitim_tarihi ? format(new Date(member.egitim_tarihi), 'dd.MM.yyyy') : "—"
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Ad Soyad', 'Görev', 'Telefon', 'E-posta', 'Sertifika', 'Eğitim Tarihi']],
        body: teamData,
        theme: 'striped',
        styles: {
          font: "Inter",
          fontSize: 8,
          cellPadding: 3
        },
        // Satır 546 civarı (Ekipler Tablosu):
        headStyles: {
          fillColor: config.color as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 25 },
          3: { cellWidth: 25, fontStyle: 'bold' },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: (data) => {
          // Highlight members without certification
          if (data.column.index === 5 && data.cell.text[0] === "—") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Warning for uncertified members
      if (certifiedCount < members.length) {
        addInfoBox(
          y,
          "⚠️ Sertifikasız Ekip Üyesi",
          `${members.length - certifiedCount} ekip üyesinin geçerli sertifikası bulunmamaktadır. ` +
          "İlgili eğitimlerin en kısa sürede tamamlanması gerekmektedir.",
          'warning'
        );
      }
    }
  });

  // ========================
  // SENARYOLAR (ULTRA GELİŞTİRİLMİŞ)
  // ========================
// SENARYOLAR (GÜVENLİ VE DÜZELTİLMİŞ)
// ========================
data.scenarios
  .filter(s => s && s.selected)
  .forEach((scenario, scenarioIdx) => {
    doc.addPage();
    
    // Güvenli dizi tanımlamaları (Hataları önlemek için boş diziye fallback)
    const procedures = scenario.procedures || [];
    const equipment = scenario.required_equipment || [];

    // Scenario header with risk badge
    const riskColors: Record<string, [number, number, number]> = {
      critical: [220, 38, 38],
      high: [234, 88, 12],
      medium: [245, 158, 11],
      low: [34, 197, 94]
    };
    
    const currentColor = riskColors[scenario.risk_level] || [100, 100, 100];
    
    doc.setFillColor(...(currentColor as [number, number, number]));
    doc.rect(0, 0, pageWidth, 70, 'F');

    // Scenario number badge
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 15, 30, 12, 'F');
    doc.setFont("Inter", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...(currentColor as [number, number, number]));
    doc.text((scenarioIdx + 1).toString(), margin + 15, 34, { align: 'center' });

    // Scenario title
    doc.setFont("Inter", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(`${scenario.icon || '•'} ${scenario.name.toUpperCase()}`, margin + 35, 28);

    // Risk level badge
    const riskLabels: Record<string, string> = {
      critical: "KRİTİK RİSK",
      high: "YÜKSEK RİSK",
      medium: "ORTA RİSK",
      low: "DÜŞÜK RİSK"
    };

    doc.setFillColor(0, 0, 0);
    // GState için (doc as any) kullanımı TypeScript hatasını çözer
    doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
    doc.roundedRect(margin + 35, 35, 60, 10, 2, 2, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    doc.setFont("Inter", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
 //   doc.text(riskLabels[scenario.risk_level] || "BELİRTİLMEDİ", margin + 65, 42, { align: 'center' });

    // Metadata
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.text(`⏱️ Tahmini Süre: ${scenario.estimated_duration || 0} dakika`, margin + 35, 52);
    
    const teamLabels: Record<string, string> = {
      sondurme: '🧯 Söndürme Ekibi',
      kurtarma: '🚑 Kurtarma Ekibi',
      koruma: '🛡️ Koruma Ekibi',
      ilk_yardim: '🩹 İlk Yardım Ekibi'
    };
 //   doc.text(`👥 Sorumlu: ${teamLabels[scenario.responsible_team] || 'Belirtilmedi'}`, margin + 35, 60);

    y = 80;

    // Required equipment (Defansif kontrol eklendi)
    if (equipment.length > 0) {
      y = addSectionTitle(y, "Gerekli Ekipman", "🛠️");
      
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');
      
      doc.setFont("Inter", "normal");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      
      const equipmentText = equipment.map((eq, i) => `${i + 1}. ${eq}`).join('  •  ');
      const equipLines = doc.splitTextToSize(equipmentText, contentWidth - 10);
      doc.text(equipLines, margin + 5, y + 8);
      
      y += 30;
    }

    // Procedures (Defansif kontrol eklendi)
    y = addSectionTitle(y, "Acil Durum Prosedürleri", "📋");

    procedures.forEach((procedure, idx) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = margin;
      }

      // Step number badge
      doc.setFillColor(...(currentColor as [number, number, number]));
      doc.circle(margin + 5, y + 4, 4, 'F');
      doc.setFont("Inter", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text((idx + 1).toString(), margin + 5, y + 5.5, { align: 'center' });

      // Procedure text
      doc.setFont("Inter", "normal");
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      
      // procedure string kontrolü
      const safeText = procedure || "";
      const procLines = doc.splitTextToSize(safeText, contentWidth - 15);
      doc.text(procLines, margin + 12, y + 5);
      
      y += (procLines.length * 4) + 4;

      // Separator
      if (idx < procedures.length - 1) {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.1);
        doc.line(margin + 10, y, pageWidth - margin, y);
        y += 3;
      }
    });

    y += 10;

    // Important note (Sayfa sonu kontrolü ile)
    if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
    }

    addInfoBox(
      y,
      "⚠️ Önemli Hatırlatma",
      "Bu prosedürler periyodik olarak tatbikatlarla test edilmeli ve eksiklikler giderilmelidir. " +
      "Tüm çalışanlar bu prosedürleri bilmeli ve acil durum ekiplerinin konumunu bilmelidir.",
      'info'
    );
  });

    if (data.blueprint.image_url) {
        doc.addPage();
        addHeader("TAHLİYE PLANI VE KROKİ", "Acil Çıkış ve Toplanma Noktaları");

        let y = 60;

        // 1. Metadata Tablosu
        if (data.blueprint.floor_count || data.blueprint.building_area || data.blueprint.emergency_exits) {
            const blueprintTableData = [];
            if (data.blueprint.floor_count) blueprintTableData.push(["Kat Sayısı", `${data.blueprint.floor_count} kat`]);
            if (data.blueprint.building_area) blueprintTableData.push(["Bina Alanı", `${data.blueprint.building_area} m²`]);
            if (data.blueprint.emergency_exits) blueprintTableData.push(["Acil Çıkış", `${data.blueprint.emergency_exits} adet`]);

            autoTable(doc, {
                startY: y,
                body: blueprintTableData,
                theme: 'grid',
                styles: { font: "Inter", fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
                    1: { fillColor: [255, 255, 255] }
                }
            });

            y = (doc as any).lastAutoTable.finalY + 10;
        }

        try {
            const imgHeight = 120;
            if (y + imgHeight > pageHeight - 20) {
                doc.addPage();
                addHeader("TAHLİYE PLANI VE KROKİ (Devam)", "Kat Planı");
                y = 60;
            }

            doc.setDrawColor(220, 38, 38);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentWidth, imgHeight);
            
            doc.addImage(
                data.blueprint.image_url,
                'JPEG',
                margin + 2,
                y + 2,
                contentWidth - 4,
                imgHeight - 4
            );

            y += imgHeight + 15; 
        } catch (e) {
            console.warn("Kroki görseli eklenemedi");
            y += 10;
        }

        if (y > pageHeight - 85) { 
            doc.addPage();
            addHeader("TAHLİYE PLANI VE KROKİ (Devam)", "Sembol Açıklamaları");
            y = 60;
        }

        y = addSectionTitle(y, "Sembol Açıklamaları", "🗺️");
        y += 5;

        const legend = [
            ["🚪", "Acil Çıkış Kapısı"],
            ["🧯", "Yangın Söndürücü"],
            ["🚨", "Yangın Alarm Butonu"],
            ["🚿", "Yangın Hortumu"],
            ["🆘", "İlk Yardım Çantası"],
            ["⚡", "Elektrik Panosu"],
            ["📍", "Toplanma Noktası"]
        ];

        legend.forEach(([icon, label]) => {
            // Liste elemanları için sayfa sonu kontrolü
            if (y > pageHeight - 35) { 
                doc.addPage();
                addHeader("TAHLİYE PLANI VE KROKİ (Devam)", "Sembol Açıklamaları");
                y = 60;
            }

            doc.setFont("Inter", "bold");
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55); 
            doc.text(icon, margin + 5, y);
            
            doc.setFont("Inter", "normal");
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            doc.text(label, margin + 18, y);
            
            y += 9;
        });

        // 4. Bilgi Kutusu Kontrolü
        y += 5;
        if (y > pageHeight - 50) {
            doc.addPage();
            addHeader("TAHLİYE PLANI VE KROKİ (Devam)", "Önemli Notlar");
            y = 60;
        }

        y = addInfoBox(
            y,
            "⚠️ Tahliye Yolu Bilgisi",
            "Tahliye yolları her zaman açık tutulmalı, önlerinde engel bulundurulmamalıdır. Acil çıkış yönlendirme levhaları aydınlatmalı ve görünür olmalıdır.",
            'warning'
        );
    }
  // ========================
  // ACİL İLETİŞİM BİLGİLERİ
  // ========================
  if (data.emergency_contacts && data.emergency_contacts.length > 0) {
    doc.addPage();
    addHeader("ACİL İLETİŞİM BİLGİLERİ", "Acil Servisler ve Resmi Kurumlar");

    y = 60;
    y = addSectionTitle(y, "Acil Yardım Hatları", "📞");

    const officialContacts = data.emergency_contacts.filter(c => 
      ['itfaiye', 'ambulans', 'polis', 'AFAD'].includes(c.type)
    );

    if (officialContacts.length > 0) {
      const officialData = officialContacts.map(c => [
        c.type === 'itfaiye' ? '🚒' :
        c.type === 'ambulans' ? '🚑' :
        c.type === 'polis' ? '🚓' : '🆘',
        c.name,
        c.phone
      ]);

      autoTable(doc, {
        startY: y,
        body: officialData,
        theme: 'grid',
        styles: {
          font: "Inter",
          fontSize: 11,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontSize: 16 },
          1: { cellWidth: 90, fontStyle: 'bold' },
          2: { cellWidth: 65, halign: 'center', fontStyle: 'bold', fontSize: 14, textColor: [220, 38, 38] }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Nearby services
    const nearbyServices = data.emergency_contacts.filter(c => c.distance !== undefined);

    if (nearbyServices.length > 0) {
      y = addSectionTitle(y, "Yakın Acil Servisler", "🏥");

      const nearbyData = nearbyServices.map(c => [
       (c.type as string) === 'hospital' || (c.type as string) === 'hastane' ? '🏥' :
       (c.type as string) === 'fire_station' || (c.type as string) === 'itfaiye' ? '🚒' : '🚓',
        c.name,
        c.phone || "—",
        c.address || "—",
        c.distance ? `${c.distance} km` : "—"
      ]);

      autoTable(doc, {
        startY: y,
        head: [['', 'Kurum', 'Telefon', 'Adres', 'Mesafe']],
        body: nearbyData,
        theme: 'striped',
        styles: {
          font: "Inter",
          fontSize: 9,
          cellPadding: 4
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontSize: 14 },
          1: { cellWidth: 45, fontStyle: 'bold' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 70 },
          4: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [34, 197, 94] }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    addInfoBox(
      y,
      "ℹ️ İletişim Bilgileri",
      "Bu liste periyodik olarak güncellenmelidir. Acil durum ekipleri bu numaraları ezbere bilmelidir.",
      'info'
    );
  }

  // ========================
  // TATBİKAT TAKVİMİ
  // ========================
  if (data.drill_schedule && data.drill_schedule.length > 0) {
    doc.addPage();
    addHeader("TATBİKAT TAKVİMİ", "Planlı Tatbikat ve Eğitimler");

    y = 60;
    
    addInfoBox(
      y,
      "📅 Tatbikat Zorunluluğu",
      "6331 sayılı İSG Kanunu ve Acil Durumlar Yönetmeliği gereği, işyerlerinde yılda en az 1 kez acil durum tatbikatı yapılması zorunludur. " +
      "Tatbikat sonuçları tutanakla kayıt altına alınmalıdır.",
      'info'
    );

    y += 35;
    y = addSectionTitle(y, "Planlanan Tatbikatlar", "📋");

    const drillData = data.drill_schedule.map((drill, idx) => [
      (idx + 1).toString(),
      format(new Date(drill.date), 'dd MMMM yyyy', { locale: tr }),
      drill.scenario,
      `${drill.duration} dk`,
      `${drill.participants} kişi`,
      drill.notes || "—"
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Tarih', 'Senaryo', 'Süre', 'Katılımcı', 'Notlar']],
      body: drillData,
      theme: 'grid',
      styles: {
        font: "Inter",
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 45, fontStyle: 'bold' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 50 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Checklist
    y = addSectionTitle(y, "Tatbikat Kontrol Listesi", "✓");

    const checklist = [
      "Tüm çalışanlar tatbikat öncesi bilgilendirildi mi?",
      "Acil durum ekipleri görev dağılımını biliyor mu?",
      "Ekipmanlar kontrol edildi mi?",
      "Toplanma noktası belirlendi mi?",
      "Tatbikat gözlemcileri atandı mı?",
      "Tatbikat sonrası değerlendirme planlandı mı?"
    ];

    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);

    checklist.forEach((item, idx) => {
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.rect(margin + 5, y - 3, 4, 4);
      
      doc.text(item, margin + 12, y);
      y += 7;
    });
  }

  // ========================
  // EK-1: AI TEKNİK DENETİM
  // ========================
  if (data.blueprint.analysis_result) {
    doc.addPage();
    
    // Special AI header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 70, 'F');
    
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.circle(pageWidth - 40, 35, 50, 'F');
    doc.circle(40, 35, 30, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setFont("Inter", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("🤖 EK-1", pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text("YAPAY ZEKA TEKNİK DENETİM RAPORU", pageWidth / 2, 42, { align: 'center' });

    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.text("Gemini 2.0 Flash Exp ile Oluşturulmuştur", pageWidth / 2, 52, { align: 'center' });

    y = 80;

    const analysis = data.blueprint.analysis_result;

    // Compliance Score
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
    
    doc.setFont("Inter", "bold");
    doc.setFontSize(12);
    doc.setTextColor(29, 78, 216);
    doc.text("Genel Uygunluk Skoru", pageWidth / 2, y + 10, { align: 'center' });
    
    const score = analysis.compliance_score || 0;
    const scoreColor = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [220, 38, 38];
    
    doc.setFontSize(32);
    doc.setTextColor(...scoreColor);
    doc.text(`${score}%`, pageWidth / 2, y + 25, { align: 'center' });

    y += 40;

    // Building Info
    if (analysis.project_info) {
      y = addSectionTitle(y, "Bina Bilgileri", "🏢");

      const buildingData = [
        ["Bina Tipi", analysis.project_info.building_category || "—"],
        ["Tahmini Alan", `${analysis.project_info.estimated_area_sqm || "—"} m²`],
        ["Kat Sayısı", analysis.project_info.floor_count?.toString() || "—"],
        ["Kullanım Amacı", analysis.project_info.usage_type || "—"]
      ];

      autoTable(doc, {
        startY: y,
        body: buildingData,
        theme: 'grid',
        styles: {
          font: "Inter",
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 60 },
          1: { fillColor: [255, 255, 255] }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Equipment Inventory
    if (analysis.equipment_inventory && analysis.equipment_inventory.length > 0) {
      y = addSectionTitle(y, "Güvenlik Ekipmanları Envanteri", "🛠️");

      const equipmentData = analysis.equipment_inventory.map((eq: any) => [
        eq.type,
        eq.count.toString(),
        eq.recommended_count?.toString() || "—",
        eq.adequacy_status === 'sufficient' ? '✓ Yeterli' :
        eq.adequacy_status === 'insufficient' ? '✗ Yetersiz' : '⚠ Fazla'
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Ekipman Tipi', 'Mevcut', 'Önerilen', 'Durum']],
        body: equipmentData,
        theme: 'striped',
        styles: {
          font: "Inter",
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 40, halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.column.index === 3) {
            if (data.cell.text[0].includes('Yetersiz')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0].includes('Yeterli')) {
              data.cell.styles.textColor = [34, 197, 94];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Safety Violations
    if (analysis.safety_violations && analysis.safety_violations.length > 0) {
      if (y > pageHeight - 100) {
        doc.addPage();
        y = margin;
      }

      y = addSectionTitle(y, "Tespit Edilen Uyumsuzluklar", "⚠️");

      const violationData = analysis.safety_violations.map((v: any, i: number) => [
        (i + 1).toString(),
        v.issue,
        v.severity === 'critical' ? '🔴 Kritik' :
        v.severity === 'warning' ? '🟡 Uyarı' : '🔵 Bilgi',
        v.recommended_action
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Tespit Edilen Sorun', 'Seviye', 'Önerilen Aksiyon']],
        body: violationData,
        theme: 'grid',
        styles: {
          font: "Inter",
          fontSize: 8,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 75 }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      if (y < pageHeight - 40) {
        addInfoBox(
          y,
          "🤖 AI Değerlendirmesi",
          "Bu rapor yapay zeka tarafından otomatik oluşturulmuştur. Tespit edilen uyumsuzlukların bir İSG uzmanı " +
          "tarafından yerinde incelenmesi ve doğrulanması önerilir.",
          'info'
        );
      }
    }
  }

  // ========================
  // SON SAYFA: MEVZUİ BİLGİLER
  // ========================
  doc.addPage();
  addHeader("YASAL DAYANAK", "Mevzuat Referansları");

  y = 60;
  y = addSectionTitle(y, "İlgili Mevzuat", "📜");

  const legislation = [
    {
      title: "6331 Sayılı İş Sağlığı ve Güvenliği Kanunu",
      article: "Madde 11 - İşverenin Acil Durumlara Karşı Alacağı Önlemler"
    },
    {
      title: "Acil Durumlar Hakkında Yönetmelik",
      article: "18.06.2013 tarih ve 28681 sayılı Resmi Gazete"
    },
    {
      title: "İşyerlerinde Acil Durumlar Hakkında Tebliğ",
      article: "Tüm işyerleri için uygulama esasları"
    },
    {
      title: "İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği",
      article: "29.12.2012 tarih ve 28512 sayılı Resmi Gazete"
    }
  ];

  legislation.forEach((law, idx) => {
    doc.setFont("Inter", "bold");
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text(`${idx + 1}. ${law.title}`, margin, y);
    
    y += 6;
    
    doc.setFont("Inter", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(law.article, margin + 5, y);
    
    y += 10;
  });

  y += 10;

  // Final note
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'FD');

  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text("⚖️ Yasal Sorumluluk", pageWidth / 2, y + 10, { align: 'center' });

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  const legalText = "Bu plan, işverenin 6331 sayılı İSG Kanunu'ndan doğan yasal yükümlülüğünü yerine getirmek amacıyla hazırlanmıştır. " +
    "Planın uygulanması, güncellenmesi ve tatbikatların yapılması işverenin sorumluluğundadır.";
  const legalLines = doc.splitTextToSize(legalText, contentWidth - 10);
  doc.text(legalLines, pageWidth / 2, y + 20, { align: 'center' });

  // ========================
  // ADD PAGE NUMBERS TO ALL PAGES
  // ========================
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber(i, totalPages);
  }

  return doc.output('blob');
}