// src/components/adep/ADEPPDFGenerator.tsx

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addInterFontsToJsPDF } from "@/utils/fonts";
import type {
  PreventiveMeasure,
  EquipmentItem,
  Drill,
  Checklist,
  RACIItem,
  LegalReference,
  RiskSource,
} from "@/types/adep-ai";

// ============================================
// COLORS & CONSTANTS
// ============================================
const COLORS = {
  primary: [15, 23, 42] as [number, number, number],
  primaryLight: [30, 41, 59] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  tableHeader: [15, 23, 42] as [number, number, number],
  tableAlt: [241, 245, 249] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  yellow: [234, 179, 8] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  purple: [168, 85, 247] as [number, number, number],
  indigo: [99, 102, 241] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
};

// ============================================
// TYPE DEFINITIONS
// ============================================
interface ADEPPlanData {
  mevzuat: {
    amac: string;
    kapsam: string;
    dayanak: string;
    tanimlar: string;
  };
  genel_bilgiler: {
    hazirlayanlar: Array<{ unvan: string; ad_soyad: string }>;
    hazirlanma_tarihi: string;
    gecerlilik_tarihi: string;
    revizyon_no: string;
    revizyon_tarihi: string;
  };
  isyeri_bilgileri: {
    adres: string;
    telefon: string;
    tehlike_sinifi: string;
    sgk_sicil_no: string;
  };
  toplanma_yeri: {
    aciklama: string;
    harita_url: string;
  };
}

interface ADEPPlan {
  id: string;
  plan_name: string;
  company_name: string;
  hazard_class: string;
  employee_count: number;
  plan_data: ADEPPlanData;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  phone?: string;
}

interface Team {
  id: string;
  team_name: string;
  team_leader_id: string | null;
  members: string[];
  team_leader?: Employee;
}

interface Contact {
  id: string;
  institution_name: string;
  phone_number: string;
}

interface Scenario {
  id: string;
  hazard_type: string;
  action_steps: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const setupFont = (doc: jsPDF) => {
  const fontLoaded = addInterFontsToJsPDF(doc);

  if (fontLoaded) {
    doc.setFont("Inter", "normal");
    console.log("✅ Inter fontu aktif");
  } else {
    doc.setFont("helvetica");
    console.warn("⚠️ Inter yüklenemedi, helvetica kullanılıyor");
  }
};

const setFontStyle = (doc: jsPDF, style: "normal" | "bold" = "normal") => {
  try {
    doc.setFont("Inter", style);
  } catch {
    doc.setFont("helvetica", style === "bold" ? "bold" : "normal");
  }
};

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);

  doc.text("Denetron İSG Yazılımı - Gizli Doküman", 15, pageHeight - 10);

  doc.text(
    `Sayfa ${pageNumber} / ${totalPages}`,
    pageWidth - 15,
    pageHeight - 10,
    { align: "right" }
  );
};

const addJustifiedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 6
): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;

  lines.forEach((line: string, index: number) => {
    const isLastLine = index === lines.length - 1;

    if (!isLastLine && line.trim().length > 0) {
      const words = line.trim().split(" ");
      if (words.length > 1) {
        const spaceWidth =
          (maxWidth - doc.getTextWidth(words.join(""))) / (words.length - 1);
        let currentX = x;

        words.forEach((word) => {
          doc.text(word, currentX, currentY);
          currentX += doc.getTextWidth(word) + spaceWidth;
        });
      } else {
        doc.text(line, x, currentY);
      }
    } else {
      doc.text(line, x, currentY);
    }

    currentY += lineHeight;
  });

  return currentY;
};

const getTeamRoleDescription = (teamName: string): string => {
  const roles: Record<string, string> = {
    "Yangın Söndürme Ekibi":
      "Yangın anında ilk müdahaleyi yapar, yangın söndürme cihazlarını kullanır ve tahliye sürecini yönetir.",
    "İlk Yardım Ekibi":
      "Yaralılara ilk müdahaleyi yapar, ambulans çağırır ve sağlık personeline yardımcı olur.",
    "Arama Kurtarma Ekibi":
      "Acil durumda kayıp veya yaralı kişileri arar, güvenli alana taşır.",
    "Güvenlik Ekibi":
      "Olay yerini güvenlik altına alır, yetkisiz girişleri engeller, kamera kayıtlarını kontrol eder.",
  };

  return roles[teamName] || "Acil durum müdahale ekibi görevi üstlenir.";
};

const addPageHeader = (doc: jsPDF, title: string, icon?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  setFontStyle(doc, "bold");
  doc.text(title, 15, 10);
};

// ============================================
// MAIN PDF GENERATOR
// ============================================
export const generateADEPPDF = async (planId: string) => {
  try {
    console.log("📄 PDF oluşturma başlatılıyor:", planId);

    // ============================================
    // 1. FETCH ALL DATA
    // ============================================
    const { data: planData, error: planError } = await supabase
      .from("adep_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError) throw planError;
    const plan = planData as unknown as ADEPPlan;

    console.log("✅ Plan verisi yüklendi");

    // Fetch related data
    const [
      teamsRes,
      contactsRes,
      scenariosRes,
      preventiveRes,
      equipmentRes,
      drillsRes,
      checklistsRes,
      raciRes,
      legalRes,
      riskRes,
    ] = await Promise.all([
      supabase
        .from("adep_teams")
        .select(
          `*, team_leader:employees!team_leader_id(id, first_name, last_name, job_title, phone)`
        )
        .eq("plan_id", planId),
      supabase.from("adep_emergency_contacts").select("*").eq("plan_id", planId),
      supabase.from("adep_scenarios").select("*").eq("plan_id", planId),
      supabase.from("adep_preventive_measures").select("*").eq("plan_id", planId),
      supabase.from("adep_equipment_inventory").select("*").eq("plan_id", planId),
      supabase.from("adep_drills").select("*").eq("plan_id", planId),
      supabase.from("adep_checklists").select("*").eq("plan_id", planId),
      supabase.from("adep_raci_matrix").select("*").eq("plan_id", planId),
      supabase.from("adep_legal_references").select("*").eq("plan_id", planId),
      supabase.from("adep_risk_sources").select("*").eq("plan_id", planId),
    ]);

    const teams = (teamsRes.data || []) as unknown as Team[];
    const contacts = (contactsRes.data || []) as unknown as Contact[];
    const scenarios = (scenariosRes.data || []) as unknown as Scenario[];
    const preventiveMeasures = (preventiveRes.data || []) as unknown as PreventiveMeasure[];
    const equipment = (equipmentRes.data || []) as unknown as EquipmentItem[];
    const drills = (drillsRes.data || []) as unknown as Drill[];
    const checklists = (checklistsRes.data || []) as unknown as Checklist[];
    const raciMatrix = (raciRes.data || []) as unknown as RACIItem[];
    const legalReferences = (legalRes.data || []) as unknown as LegalReference[];
    const riskSources = (riskRes.data || []) as unknown as RiskSource[];

    console.log("✅ Tüm modül verileri yüklendi");

    // Fetch employee details for team members
    const allMemberIds = teams.flatMap((t) => (t.members || []) as string[]);
    let memberNames: Record<string, { name: string; phone: string }> = {};

    if (allMemberIds.length > 0) {
      const { data: members } = await supabase
        .from("employees")
        .select("id, first_name, last_name, phone")
        .in("id", allMemberIds);

      members?.forEach((m) => {
        memberNames[m.id] = {
          name: `${m.first_name} ${m.last_name}`,
          phone: m.phone || "-",
        };
      });
    }

    // ============================================
    // 2. CREATE PDF
    // ============================================
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    setupFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    let currentPage = 1;
    let yPos = margin;

    // Calculate total pages (approximation)
    let estimatedPages = 5; // Base pages
    estimatedPages += teams.length > 0 ? 1 : 0;
    estimatedPages += contacts.length > 0 ? 1 : 0;
    estimatedPages += scenarios.length;
    estimatedPages += preventiveMeasures.length > 0 ? 1 : 0;
    estimatedPages += equipment.length > 0 ? 1 : 0;
    estimatedPages += drills.length > 0 ? 1 : 0;
    estimatedPages += checklists.length > 0 ? 1 : 0;
    estimatedPages += raciMatrix.length > 0 ? 1 : 0;
    estimatedPages += legalReferences.length > 0 ? 1 : 0;
    estimatedPages += riskSources.length > 0 ? 1 : 0;

    const totalPages = estimatedPages;

    // ============================================
    // PAGE 1: COVER PAGE
    // ============================================
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    setFontStyle(doc, "bold");
    doc.text("ACİL DURUM EYLEM PLANI", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    setFontStyle(doc, "normal");
    doc.text("(ADEP)", pageWidth / 2, 28, { align: "center" });

    const boxY = 60;
    const boxHeight = 60;

    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(1);
    doc.rect(margin, boxY, contentWidth, boxHeight);

    doc.setDrawColor(
      COLORS.secondary[0],
      COLORS.secondary[1],
      COLORS.secondary[2]
    );
    doc.setLineWidth(0.5);
    doc.rect(margin + 5, boxY + 5, contentWidth - 10, boxHeight - 10);

    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(24);
    setFontStyle(doc, "bold");
    doc.text(plan.company_name, pageWidth / 2, boxY + 30, { align: "center" });

    doc.setFontSize(12);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(plan.plan_name, pageWidth / 2, boxY + 45, { align: "center" });

    const tableY = boxY + boxHeight + 20;
    const genelBilgiler = plan.plan_data.genel_bilgiler;

    autoTable(doc, {
      startY: tableY,
      head: [
        [
          {
            content: "HAZIRLAYAN",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
          {
            content: "ONAYLAYAN",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
          {
            content: "GEÇERLİLİK",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
        ],
      ],
      body: [
        [
          genelBilgiler.hazirlayanlar[0]?.ad_soyad ||
            "........................\n" + genelBilgiler.hazirlayanlar[0]?.unvan,
          "........................\nİşveren / İşveren Vekili",
          `Hazırlanma: ${genelBilgiler.hazirlanma_tarihi}\nGeçerlilik: ${genelBilgiler.gecerlilik_tarihi}`,
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 8,
        valign: "middle",
        halign: "center",
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.5,
        font: "Inter",
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
        font: "Inter",
      },
      columnStyles: {
        0: { cellWidth: contentWidth / 3 },
        1: { cellWidth: contentWidth / 3 },
        2: { cellWidth: contentWidth / 3 },
      },
    });

    const revY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(
      COLORS.secondary[0],
      COLORS.secondary[1],
      COLORS.secondary[2]
    );
    doc.text(
      `Revizyon No: ${genelBilgiler.revizyon_no}`,
      pageWidth / 2,
      revY,
      { align: "center" }
    );
    doc.text(
      `Revizyon Tarihi: ${genelBilgiler.revizyon_tarihi}`,
      pageWidth / 2,
      revY + 6,
      { align: "center" }
    );

    addFooter(doc, currentPage++, totalPages);

    // ============================================
    // PAGE 2: İŞYERİ BİLGİLERİ
    // ============================================
    doc.addPage();
    yPos = margin;

    addPageHeader(doc, "1. İŞYERİ BİLGİLERİ");

    yPos = 25;

    const isyeriBilgileri =
    plan?.plan_data?.isyeri_bilgileri ?? {
      adres: "",
      telefon: "",
      tehlike_sinifi: "",
      sgk_sicil_no: "",
    };
    
    autoTable(doc, {
      startY: yPos,
      head: [
        [
          {
            content: "İŞYERİ BİLGİLERİ",
            colSpan: 2,
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
        ],
      ],
      body: [
        ["Firma Adı/Ünvanı:", plan.company_name],
        ["Adres:", isyeriBilgileri.adres || "-"],
        ["Telefon:", isyeriBilgileri.telefon || "-"],
        [
          "Tehlike Sınıfı:",
          isyeriBilgileri.tehlike_sinifi || plan.hazard_class,
        ],
        ["SGK Sicil No:", isyeriBilgileri.sgk_sicil_no || "-"],
        ["Çalışan Sayısı:", plan.employee_count.toString()],
      ],
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.5,
        font: "Inter",
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        font: "Inter",
      },
      columnStyles: {
        0: {
          cellWidth: 60,
          fontStyle: "bold",
          fillColor: COLORS.tableAlt,
        },
        1: { cellWidth: contentWidth - 60 },
      },
    });

    addFooter(doc, currentPage++, totalPages);

    // ============================================
    // PAGE 3: MEVZUAT
    // ============================================
    doc.addPage();
    yPos = margin;

    addPageHeader(doc, "2. MEVZUAT BİLGİLERİ");

    yPos = 30;

    const mevzuat = plan.plan_data.mevzuat;

    // Amaç
    doc.setFontSize(12);
    setFontStyle(doc, "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("2.1. AMAÇ", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos = addJustifiedText(doc, mevzuat.amac, margin, yPos, contentWidth);
    yPos += 10;

    // Kapsam
    if (yPos > pageHeight - 60) {
      addFooter(doc, currentPage++, totalPages);
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    setFontStyle(doc, "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("2.2. KAPSAM", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos = addJustifiedText(doc, mevzuat.kapsam, margin, yPos, contentWidth);
    yPos += 10;

    // Dayanak
    if (yPos > pageHeight - 60) {
      addFooter(doc, currentPage++, totalPages);
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    setFontStyle(doc, "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("2.3. YASAL DAYANAK", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos = addJustifiedText(doc, mevzuat.dayanak, margin, yPos, contentWidth);

    addFooter(doc, currentPage++, totalPages);

    // ============================================
    // PAGE 4: TANIMLAR
    // ============================================
    doc.addPage();
    yPos = margin;

    addPageHeader(doc, "3. TANIMLAR");

    yPos = 30;

    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos = addJustifiedText(doc, mevzuat.tanimlar, margin, yPos, contentWidth);

    addFooter(doc, currentPage++, totalPages);

    // ============================================
    // PAGE 5: ACİL DURUM EKİPLERİ
    // ============================================
    if (teams.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "4. ACİL DURUM EKİPLERİ");

      yPos = 30;

      teams.forEach((team, index) => {
        if (yPos > pageHeight - 80) {
          addFooter(doc, currentPage++, totalPages);
          doc.addPage();
          yPos = margin + 10;
        }

        doc.setFontSize(11);
        setFontStyle(doc, "bold");
        doc.setTextColor(
          COLORS.primary[0],
          COLORS.primary[1],
          COLORS.primary[2]
        );
        doc.text(`${index + 1}. ${team.team_name}`, margin, yPos);
        yPos += 7;

        doc.setFontSize(9);
        setFontStyle(doc, "normal");
        doc.setTextColor(
          COLORS.secondary[0],
          COLORS.secondary[1],
          COLORS.secondary[2]
        );
        const roleDesc = getTeamRoleDescription(team.team_name);
        const roleLines = doc.splitTextToSize(roleDesc, contentWidth);
        roleLines.forEach((line: string) => {
          doc.text(line, margin, yPos);
          yPos += 5;
        });
        yPos += 3;

        const teamMembers = (team.members || []) as string[];
        const tableData: string[][] = [];

        if (team.team_leader_id && team.team_leader) {
          tableData.push([
            "Ekip Lideri",
            `${team.team_leader.first_name} ${team.team_leader.last_name}`,
            team.team_leader.job_title || "-",
            team.team_leader.phone || "-",
          ]);
        }

        teamMembers.forEach((memberId) => {
          const member = memberNames[memberId];
          if (member) {
            tableData.push(["Ekip Üyesi", member.name, "-", member.phone]);
          }
        });

        if (tableData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [
              [
                {
                  content: "GÖREVİ",
                  styles: {
                    halign: "center",
                    fillColor: COLORS.primary,
                    fontStyle: "bold",
                    font: "Inter",
                  },
                },
                {
                  content: "AD SOYAD",
                  styles: {
                    halign: "center",
                    fillColor: COLORS.primary,
                    fontStyle: "bold",
                    font: "Inter",
                  },
                },
                {
                  content: "ÜNVAN",
                  styles: {
                    halign: "center",
                    fillColor: COLORS.primary,
                    fontStyle: "bold",
                    font: "Inter",
                  },
                },
                {
                  content: "TELEFON",
                  styles: {
                    halign: "center",
                    fillColor: COLORS.primary,
                    fontStyle: "bold",
                    font: "Inter",
                  },
                },
              ],
            ],
            body: tableData,
            theme: "grid",
            styles: {
              fontSize: 9,
              cellPadding: 4,
              textColor: COLORS.text,
              lineColor: COLORS.border,
              lineWidth: 0.5,
              font: "Inter",
            },
            headStyles: {
              fillColor: COLORS.tableHeader,
              textColor: [255, 255, 255],
              fontStyle: "bold",
              font: "Inter",
            },
            alternateRowStyles: {
              fillColor: COLORS.tableAlt,
            },
            columnStyles: {
              0: { cellWidth: 35, fontStyle: "bold" },
              1: { cellWidth: 50 },
              2: { cellWidth: 45 },
              3: { cellWidth: 40, halign: "center" },
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: İLETİŞİM NUMARALARI
    // ============================================
    if (contacts.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "5. ACİL DURUM İLETİŞİM NUMARALARI");

      yPos = 30;

      const contactsTableData = contacts.map((c) => [
        c.institution_name,
        c.phone_number,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "KURUM/BİRİM",
              styles: {
                halign: "center",
                fillColor: COLORS.primary,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "TELEFON NUMARASI",
              styles: {
                halign: "center",
                fillColor: COLORS.primary,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: contactsTableData,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.tableHeader,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 11,
          font: "Inter",
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 100, fontStyle: "bold" },
          1: {
            cellWidth: 70,
            halign: "center",
            fontStyle: "bold",
            fontSize: 11,
          },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: SENARYOLAR
    // ============================================
    if (scenarios.length > 0) {
      scenarios.forEach((scenario, index) => {
        doc.addPage();
        yPos = margin;

        addPageHeader(doc, `6.${index + 1}. ${scenario.hazard_type} SENARYOSU`);

        yPos = 30;

        doc.setFontSize(12);
        setFontStyle(doc, "bold");
        doc.setTextColor(
          COLORS.primary[0],
          COLORS.primary[1],
          COLORS.primary[2]
        );
        doc.text("OLAY ANINDA YAPILACAKLAR:", margin, yPos);
        yPos += 10;

        doc.setFontSize(10);
        setFontStyle(doc, "normal");
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

        const steps = scenario.action_steps.split("\n");
        steps.forEach((step) => {
          if (step.trim()) {
            const stepLines = doc.splitTextToSize(step, contentWidth - 10);
            stepLines.forEach((line: string) => {
              if (yPos > pageHeight - 30) {
                addFooter(doc, currentPage++, totalPages);
                doc.addPage();
                yPos = margin + 10;
              }
              doc.text(line, margin + 5, yPos);
              yPos += 6;
            });
            yPos += 2;
          }
        });

        addFooter(doc, currentPage++, totalPages);
      });
    }

    // ============================================
    // PAGE: ÖNLEYİCİ TEDBİR MATRİSİ
    // ============================================
    if (preventiveMeasures.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "7. ÖNLEYİCİ VE SINIRLANDIRICI TEDBİR MATRİSİ");

      yPos = 30;

      const preventiveTableData = preventiveMeasures.map((m) => [
        m.risk_type,
        m.preventive_action,
        m.responsible_role,
        m.control_period,
        m.status === "completed" ? "✓" : m.status === "in_progress" ? "◐" : "○",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Risk Türü",
              styles: {
                halign: "center",
                fillColor: COLORS.orange,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Önleyici Aksiyon",
              styles: {
                halign: "center",
                fillColor: COLORS.orange,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Sorumlu",
              styles: {
                halign: "center",
                fillColor: COLORS.orange,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Periyot",
              styles: {
                halign: "center",
                fillColor: COLORS.orange,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Durum",
              styles: {
                halign: "center",
                fillColor: COLORS.orange,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: preventiveTableData,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.orange,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: "bold" },
          1: { cellWidth: 70 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 15, halign: "center", fontSize: 12 },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: EKIPMAN ENVANTERI
    // ============================================
    if (equipment.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "8. ACİL DURUM EKIPMAN ENVANTERI");

      yPos = 30;

      const equipmentTableData = equipment.map((e) => [
        e.equipment_name,
        e.equipment_type,
        e.quantity.toString(),
        e.location,
        e.next_inspection_date || "-",
        e.status === "active" ? "Aktif" : e.status === "maintenance" ? "Bakım" : "Dışı",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Ekipman",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Tür",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Adet",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Konum",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Sonraki Kontrol",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Durum",
              styles: {
                halign: "center",
                fillColor: COLORS.blue,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: equipmentTableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.blue,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 40 },
          4: { cellWidth: 25, halign: "center", fontSize: 7 },
          5: { cellWidth: 20, halign: "center" },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: TATBİKATLAR
    // ============================================
    if (drills.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "9. TATBİKAT KAYITLARI");

      yPos = 30;

      const drillsTableData = drills.map((d) => [
        d.drill_type,
        new Date(d.drill_date).toLocaleDateString("tr-TR"),
        d.participants_count?.toString() || "-",
        d.duration_minutes ? `${d.duration_minutes} dk` : "-",
        d.success_rate || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Tatbikat Türü",
              styles: {
                halign: "center",
                fillColor: COLORS.green,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Tarih",
              styles: {
                halign: "center",
                fillColor: COLORS.green,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Katılımcı",
              styles: {
                halign: "center",
                fillColor: COLORS.green,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Süre",
              styles: {
                halign: "center",
                fillColor: COLORS.green,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Başarı",
              styles: {
                halign: "center",
                fillColor: COLORS.green,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: drillsTableData,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.green,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: KONTROL LİSTELERİ
    // ============================================
    if (checklists.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "10. PERİYODİK KONTROL CHECKLİST");

      yPos = 30;

      const checklistTableData = checklists.map((c) => [
        c.checklist_category,
        c.checklist_item,
        c.check_frequency,
        c.responsible_role,
        c.status === "checked" ? "✓" : c.status === "issue_found" ? "⚠" : "○",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Kategori",
              styles: {
                halign: "center",
                fillColor: COLORS.purple,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Kontrol Maddesi",
              styles: {
                halign: "center",
                fillColor: COLORS.purple,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Periyot",
              styles: {
                halign: "center",
                fillColor: COLORS.purple,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Sorumlu",
              styles: {
                halign: "center",
                fillColor: COLORS.purple,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Durum",
              styles: {
                halign: "center",
                fillColor: COLORS.purple,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: checklistTableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.purple,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15, halign: "center", fontSize: 12 },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: RACI MATRİSİ
    // ============================================
    if (raciMatrix.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "11. RACI SORUMLULUK MATRİSİ");

      yPos = 30;

      const raciTableData = raciMatrix.map((r) => [
        r.task_name,
        r.responsible || "-",
        r.accountable || "-",
        r.consulted || "-",
        r.informed || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Görev",
              styles: {
                halign: "center",
                fillColor: COLORS.indigo,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "R",
              styles: {
                halign: "center",
                fillColor: COLORS.indigo,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "A",
              styles: {
                halign: "center",
                fillColor: COLORS.indigo,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "C",
              styles: {
                halign: "center",
                fillColor: COLORS.indigo,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "I",
              styles: {
                halign: "center",
                fillColor: COLORS.indigo,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: raciTableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.indigo,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold" },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: MEVZUAT REFERANSLARI
    // ============================================
    if (legalReferences.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "12. MEVZUAT REFERANSLARI");

      yPos = 30;

      const legalTableData = legalReferences.map((l) => [
        l.law_name,
        l.article_number || "-",
        l.requirement_summary,
        l.compliance_status === "compliant"
          ? "✓"
          : l.compliance_status === "partial"
          ? "◐"
          : "✗",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Kanun/Yönetmelik",
              styles: {
                halign: "center",
                fillColor: COLORS.amber,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Madde",
              styles: {
                halign: "center",
                fillColor: COLORS.amber,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Gereklilik",
              styles: {
                halign: "center",
                fillColor: COLORS.amber,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Uyum",
              styles: {
                halign: "center",
                fillColor: COLORS.amber,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: legalTableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.amber,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold" },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: 85 },
          3: { cellWidth: 15, halign: "center", fontSize: 12 },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // PAGE: RİSK KAYNAKLARI
    // ============================================
    if (riskSources.length > 0) {
      doc.addPage();
      yPos = margin;

      addPageHeader(doc, "13. RİSK KAYNAKLARI HARİTASI");

      yPos = 30;

      const riskTableData = riskSources.map((r) => [
        r.risk_source,
        r.location,
        r.risk_level === "critical"
          ? "KRİTİK"
          : r.risk_level === "high"
          ? "YÜKSEK"
          : r.risk_level === "medium"
          ? "ORTA"
          : "DÜŞÜK",
        r.potential_impact,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            {
              content: "Risk Kaynağı",
              styles: {
                halign: "center",
                fillColor: COLORS.red,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Konum",
              styles: {
                halign: "center",
                fillColor: COLORS.red,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Seviye",
              styles: {
                halign: "center",
                fillColor: COLORS.red,
                fontStyle: "bold",
                font: "Inter",
              },
            },
            {
              content: "Potansiyel Etki",
              styles: {
                halign: "center",
                fillColor: COLORS.red,
                fontStyle: "bold",
                font: "Inter",
              },
            },
          ],
        ],
        body: riskTableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.5,
          font: "Inter",
        },
        headStyles: {
          fillColor: COLORS.red,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          font: "Inter",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAlt,
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: "bold" },
          1: { cellWidth: 35 },
          2: { cellWidth: 25, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 70 },
        },
      });

      addFooter(doc, currentPage++, totalPages);
    }

    // ============================================
    // FINAL PAGE: İMZA
    // ============================================
    doc.addPage();
    yPos = margin;

    addPageHeader(doc, "14. ONAY VE İMZA");

    yPos = 35;

    const imzaAlanlari = [
      { unvan: "İŞVEREN / İŞVEREN VEKİLİ", ad: "", imza: "" },
      {
        unvan: "İŞ GÜVENLİĞİ UZMANI",
        ad:
          (genelBilgiler.hazirlayanlar &&
            genelBilgiler.hazirlayanlar[0])?.ad_soyad || "",
        imza: "",
      },
      { unvan: "İŞYERİ HEKİMİ", ad: "", imza: "" },
    ];

    teams.forEach((team) => {
      if (team.team_leader) {
        imzaAlanlari.push({
          unvan: `${team.team_name.toUpperCase()} LİDERİ`,
          ad: `${team.team_leader.first_name} ${team.team_leader.last_name}`,
          imza: "",
        });
      }
    });

    const imzaTableData = imzaAlanlari.map((imza) => [
      imza.unvan,
      imza.ad,
      "",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          {
            content: "ÜNVAN",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
          {
            content: "AD SOYAD",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
          {
            content: "İMZA",
            styles: {
              halign: "center",
              fillColor: COLORS.primary,
              fontStyle: "bold",
              font: "Inter",
            },
          },
        ],
      ],
      body: imzaTableData,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 10,
        minCellHeight: 20,
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.5,
        font: "Inter",
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        font: "Inter",
      },
      columnStyles: {
        0: {
          cellWidth: 60,
          fontStyle: "bold",
          fillColor: COLORS.tableAlt,
        },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(10);
    setFontStyle(doc, "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, margin, yPos);

    yPos += 15;
    doc.setFontSize(9);
    setFontStyle(doc, "normal");
    doc.setTextColor(
      COLORS.secondary[0],
      COLORS.secondary[1],
      COLORS.secondary[2]
    );
    const disclaimerText =
      "Bu Acil Durum Eylem Planı, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ilgili yönetmelikler çerçevesinde hazırlanmıştır. Plan AI destekli Denetron İSG Yazılımı ile oluşturulmuş olup, yılda en az bir kez gözden geçirilmeli ve güncellenmelidir. Tüm modüller veritabanından dinamik olarak üretilmiştir.";
    const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
    disclaimerLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
    });

    addFooter(doc, currentPage, currentPage);

    // ============================================
    // SAVE PDF
    // ============================================
    const fileName = `ADEP_${plan.company_name.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${new Date().toISOString().split("T")[0]}.pdf`;
    
    console.log("💾 PDF kaydediliyor:", fileName);
    doc.save(fileName);

    console.log("✅ PDF başarıyla oluşturuldu");
    toast.success("PDF başarıyla indirildi", {
      description: `${currentPage} sayfa • 7 AI modülü dahil`,
    });

    return doc;
  } catch (error: any) {
    console.error("💥 PDF generation error:", error);
    toast.error("PDF oluşturma hatası", {
      description: error.message || "Bilinmeyen hata",
    });
    throw error;
  }
};