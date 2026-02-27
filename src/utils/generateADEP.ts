//src\utils\generateADEP.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addInterFontsToJsPDF } from "./fonts";
import type { ADEPData } from "@/types/adep";

export async function generateADEPPDF(data: ADEPData): Promise<Blob> {
  const doc = new jsPDF();
  
  // ✅ Inter fontlarını yükle
  addInterFontsToJsPDF(doc);
  doc.setFont("Inter", "normal");

  let currentPage = 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ========================
  // KAPAK SAYFASI
  // ========================
  doc.setFillColor(239, 68, 68); // Red-500
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Logo (varsa)
  if (data.company_info.logo_url) {
    try {
      doc.addImage(data.company_info.logo_url, 'PNG', margin, 15, 40, 40);
    } catch (e) {
      console.warn("Logo yüklenemedi");
    }
  }

  // Başlık
  doc.setFont("Inter", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("ACİL DURUM EYLEM PLANI", pageWidth / 2, 50, { align: 'center' });

  // Alt başlık
  doc.setFontSize(14);
  doc.setFont("Inter", "normal");
  doc.text(data.company_info.firma_adi, pageWidth / 2, 65, { align: 'center' });

  // Mevzuat ibaresi
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(0, 90, pageWidth, 40, 'F');
  
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.text(
    "6331 Sayılı İş Sağlığı ve Güvenliği Kanunu Md. 11'e Uygun Olarak Hazırlanmıştır",
    pageWidth / 2,
    105,
    { align: 'center' }
  );

  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("İŞYERİ BİLGİLERİ", margin, 145);

  // İşyeri bilgileri tablosu
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  
  const infoData = [
    ["Firma Adı", data.company_info.firma_adi],
    ["Adres", data.company_info.adres],
    ["Tehlike Sınıfı", data.company_info.tehlike_sinifi],
    ["Çalışan Sayısı", data.company_info.calisan_sayisi.toString()],
    ["Hazırlanma Tarihi", new Date().toLocaleDateString('tr-TR')]
  ];

  autoTable(doc, {
    startY: 155,
    head: [],
    body: infoData,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      1: { fillColor: [255, 255, 255] }
    }
  });

  // ========================
  // SAYFA 2: İÇİNDEKİLER
  // ========================
  doc.addPage();
  currentPage++;

  doc.setFont("Inter", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text("İÇİNDEKİLER", margin, 30);

  const tocItems = [
    "1. İşyeri Bilgileri",
    "2. Acil Durum Ekipleri",
    "   2.1. Söndürme Ekibi",
    "   2.2. Arama-Kurtarma Ekibi",
    "   2.3. Koruma Ekibi",
    "   2.4. İlk Yardım Ekibi",
    "3. Acil Durum Senaryoları",
    "4. Tahliye Krokisi",
    "Ek-1: Teknik Denetim Raporu"
  ];

  doc.setFont("Inter", "normal");
  doc.setFontSize(11);
  let tocY = 50;
  
  tocItems.forEach((item, idx) => {
    doc.text(item, margin, tocY);
    doc.text(`${idx + 1}`, pageWidth - margin - 10, tocY, { align: 'right' });
    tocY += 10;
  });

  // ========================
  // SAYFA 3+: EKIP TABLOLARI
  // ========================
  const teamNames = {
    sondurme: "SÖNDÜRME EKİBİ",
    kurtarma: "ARAMA-KURTARMA EKİBİ",
    koruma: "KORUMA EKİBİ",
    ilk_yardim: "İLK YARDIM EKİBİ"
  };

  Object.entries(data.teams).forEach(([teamKey, members]) => {
    doc.addPage();
    currentPage++;

    doc.setFont("Inter", "bold");
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38);
    doc.text(teamNames[teamKey as keyof typeof teamNames], margin, 30);

    const teamData = members.map((member, idx) => [
      (idx + 1).toString(),
      member.ad_soyad,
      member.gorev,
      member.telefon
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Ad Soyad', 'Görev', 'Telefon']],
      body: teamData,
      theme: 'striped',
      styles: {
        font: "Inter",
        fontSize: 10
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    });
  });

  // ========================
  // SENARYOLAR
  // ========================
  doc.addPage();
  currentPage++;

  doc.setFont("Inter", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text("ACİL DURUM SENARYOLARI", margin, 30);

  let scenarioY = 50;
  
  data.scenarios
    .filter(s => s.selected)
    .forEach((scenario, idx) => {
      if (scenarioY > pageHeight - 80) {
        doc.addPage();
        currentPage++;
        scenarioY = 30;
      }

      doc.setFont("Inter", "bold");
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(`${scenario.icon} ${idx + 1}. ${scenario.name.toUpperCase()}`, margin, scenarioY);
      scenarioY += 10;

      doc.setFont("Inter", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      scenario.procedures.forEach((proc, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${proc}`, pageWidth - margin * 2);
        doc.text(lines, margin + 5, scenarioY);
        scenarioY += lines.length * 5 + 3;

        if (scenarioY > pageHeight - 40) {
          doc.addPage();
          currentPage++;
          scenarioY = 30;
        }
      });

      scenarioY += 10;
    });

  // ========================
  // KROKİ SAYFASI
  // ========================
  if (data.blueprint.image_url) {
    doc.addPage();
    currentPage++;

    doc.setFont("Inter", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("TAHLİYE KROKİSİ", margin, 30);

    try {
      doc.addImage(
        data.blueprint.image_url,
        'JPEG',
        margin,
        50,
        pageWidth - margin * 2,
        150
      );
    } catch (e) {
      console.warn("Kroki görseli eklenemedi");
    }
  }

  // ========================
  // EK-1: AI TEKNİK DENETİM RAPORU
  // ========================
  if (data.blueprint.analysis_result) {
    doc.addPage();
    currentPage++;

    doc.setFont("Inter", "bold");
    doc.setFontSize(18);
    doc.setTextColor(29, 78, 216);
    doc.text("EK-1: YAPAY ZEKA TEKNİK DENETİM RAPORU", margin, 30);

    const analysis = data.blueprint.analysis_result;
    let y = 50;

    // Bina Bilgileri
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Bina Bilgileri", margin, y);
    y += 8;

    doc.setFont("Inter", "normal");
    doc.setFontSize(10);
    doc.text(`Tip: ${analysis.project_info.building_category}`, margin + 5, y);
    y += 6;
    doc.text(`Alan: ${analysis.project_info.estimated_area_sqm} m²`, margin + 5, y);
    y += 6;
    doc.text(`Uygunluk Skoru: ${analysis.compliance_score}%`, margin + 5, y);
    y += 15;

    // Ekipman Envanteri
    doc.setFont("Inter", "bold");
    doc.setFontSize(12);
    doc.text("Güvenlik Ekipmanları", margin, y);
    y += 10;

    const equipmentData = analysis.equipment_inventory.map((eq: any) => [
      eq.type,
      eq.count.toString(),
      eq.adequacy_status === 'sufficient' ? '✓ Yeterli' :
      eq.adequacy_status === 'insufficient' ? '✗ Yetersiz' : '⚠ Fazla'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Ekipman', 'Adet', 'Durum']],
      body: equipmentData,
      theme: 'grid',
      styles: { font: "Inter", fontSize: 9 }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Uyumsuzluklar
    if (analysis.safety_violations.length > 0) {
      doc.setFont("Inter", "bold");
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text("Tespit Edilen Uyumsuzluklar", margin, y);
      y += 10;

      const violationData = analysis.safety_violations.map((v: any, i: number) => [
        (i + 1).toString(),
        v.issue,
        v.severity === 'critical' ? '🔴 Kritik' :
        v.severity === 'warning' ? '🟡 Uyarı' : '🔵 Bilgi',
        v.recommended_action
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Sorun', 'Seviye', 'Önerilen Aksiyon']],
        body: violationData,
        theme: 'striped',
        styles: { font: "Inter", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20 },
          3: { cellWidth: 60 }
        }
      });
    }
  }

  // ========================
  // FOOTER (TÜM SAYFALARDA)
  // ========================
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Inter", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sayfa ${i} / ${totalPages} | Denetron İSG © ${new Date().getFullYear()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}