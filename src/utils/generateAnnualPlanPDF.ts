import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addInterFontsToJsPDF } from "./fonts";
import type { WorkPlanRow, TrainingPlanRow, EvaluationRow } from "@/types/annualPlans";
import { MONTH_NAMES } from "@/types/annualPlans";

export async function generateWorkPlanPDF(
  data: WorkPlanRow[],
  year: number,
  companyName: string
): Promise<Blob> {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  addInterFontsToJsPDF(doc);
  doc.setFont("Inter", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Başlık
  doc.setFont("Inter", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`${year} YILI ÇALIŞMA PLANI`, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("Inter", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(companyName, pageWidth / 2, 23, { align: 'center' });

  // Tablo başlıkları
  const headers = [
    { content: 'Faaliyet', styles: { cellWidth: 60 } },
    { content: 'Sorumlu', styles: { cellWidth: 40 } },
    ...MONTH_NAMES.map(month => ({ content: month.substring(0, 3), styles: { cellWidth: 12 } }))
  ];

  // ✅ Tablo verileri (Tip düzeltmesi)
  const tableData = data.map(row => {
    const monthCells = Object.values(row.months).map(status => {
      if (status === "planned") {
        return { 
          content: "P", 
          styles: { 
            fillColor: [253, 224, 71] as [number, number, number], // ✅ Tuple olarak belirt
            textColor: [0, 0, 0] as [number, number, number]
          } 
        };
      }
      if (status === "completed") {
        return { 
          content: "✓", 
          styles: { 
            fillColor: [34, 197, 94] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number]
          } 
        };
      }
      return { 
        content: "-", 
        styles: { 
          fillColor: [241, 245, 249] as [number, number, number],
          textColor: [148, 163, 184] as [number, number, number]
        } 
      };
    });

    return [
      row.activity_name,
      row.responsible,
      ...monthCells
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: tableData,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'left' }
    }
  });

  // Lejant
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont("Inter", "normal");
  doc.text("Lejant:", margin, finalY);
  
  doc.setFillColor(253, 224, 71);
  doc.rect(margin + 15, finalY - 3, 5, 4, 'F');
  doc.text("Planlandı", margin + 22, finalY);

  doc.setFillColor(34, 197, 94);
  doc.rect(margin + 45, finalY - 3, 5, 4, 'F');
  doc.text("Tamamlandı", margin + 52, finalY);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Denetron İSG`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  return doc.output('blob');
}

export async function generateTrainingPlanPDF(
  data: TrainingPlanRow[],
  year: number,
  companyName: string
): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  addInterFontsToJsPDF(doc);
  doc.setFont("Inter", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Başlık
  doc.setFont("Inter", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`${year} YILI EĞİTİM PLANI`, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("Inter", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(companyName, pageWidth / 2, 28, { align: 'center' });

  // Tablo verileri
  const tableData = data.map((row, idx) => [
    (idx + 1).toString(),
    row.topic,
    `${row.duration_hours} saat`,
    row.trainer,
    row.target_participants.toString(),
    MONTH_NAMES[row.planned_month],
    row.status === "completed" ? "✓ Tamamlandı" : "Planlandı"
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Eğitim Konusu', 'Süre', 'Eğitici', 'Hedef', 'Ay', 'Durum']],
    body: tableData,
    theme: 'striped',
    styles: {
      font: "Inter",
      fontSize: 9,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number], // ✅ Düzeltildi
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' }
    }
  });

  // İstatistikler
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalHours = data.reduce((sum, row) => sum + row.duration_hours, 0);
  const totalParticipants = data.reduce((sum, row) => sum + row.target_participants, 0);
  const completedCount = data.filter(row => row.status === "completed").length;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, finalY, pageWidth - margin * 2, 25, 'F');

  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("ÖZETLER", margin + 5, finalY + 7);

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.text(`Toplam Eğitim Sayısı: ${data.length}`, margin + 5, finalY + 13);
  doc.text(`Toplam Eğitim Saati: ${totalHours} saat`, margin + 5, finalY + 18);
  doc.text(`Hedef Katılımcı: ${totalParticipants} kişi`, pageWidth / 2 + 5, finalY + 13);
  doc.text(`Tamamlanan: ${completedCount}`, pageWidth / 2 + 5, finalY + 18);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Denetron İSG`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  return doc.output('blob');
}

export async function generateEvaluationReportPDF(
  data: EvaluationRow[],
  year: number,
  companyName: string
): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  addInterFontsToJsPDF(doc);
  doc.setFont("Inter", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Başlık
  doc.setFont("Inter", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`${year} YILI DEĞERLENDİRME RAPORU`, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("Inter", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(companyName, pageWidth / 2, 28, { align: 'center' });

  // Tablo verileri
  const tableData = data.map((row, idx) => [
    (idx + 1).toString(),
    row.activity,
    row.planned_date,
    row.actual_date || "-",
    row.status === "completed" ? "✓" : row.status === "pending" ? "⏳" : "✗",
    row.result_comment
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Faaliyet', 'Planlanan', 'Gerçekleşen', 'Durum', 'Sonuç ve Yorum']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: "Inter",
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number], // ✅ Düzeltildi
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 45 }
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(
      `Sayfa ${i}/${totalPages} | Denetron İSG © ${new Date().getFullYear()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}