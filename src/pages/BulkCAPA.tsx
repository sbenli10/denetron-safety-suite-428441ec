//src\pages\BulkCAPA.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Calendar,
  Users,
  CheckCircle2,
  Eye,
  X,
  Upload,
  Cloud,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  AlignmentType,
  UnderlineType,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";

// ✅ INTERFACE DEFINITIONS
// HazardEntry interface'ine ekle:
interface HazardEntry {
  id: string;
  description: string;
  riskDefinition: string;
  correctiveAction: string;
  preventiveAction: string;
  importance_level: "Normal" | "Yüksek" | "Kritik";
  termin_date: string;
  related_department: string;
  notification_method: string; // ✅ YENİ ALAN
  media_urls: string[];
  ai_analyzed: boolean;
}

interface OrganizationData {
  id: string; // ✅ EKLE
  name: string;
  slug: string;
}

interface AIAnalysisResult {
  description: string;
  riskDefinition: string;
  correctiveAction: string;
  preventiveAction: string;
  importance_level: "Normal" | "Yüksek" | "Kritik";
}

// ✅ CONSTANTS
const DEPARTMENTS = [
  "İşveren",
  "Bakım",
  "Üretim",
  "İnsan Kaynakları",
  "Lojistik",
  "Kalite",
  "Satış",
  "Muhasebe",
  "Diğer",
];

const IMPORTANCE_LEVELS = [
  { value: "Normal", label: "🟢 Normal", color: "bg-success/10 text-success" },
  { value: "Yüksek", label: "🟡 Yüksek", color: "bg-warning/10 text-warning" },
  {
    value: "Kritik",
    label: "🔴 Kritik",
    color: "bg-destructive/10 text-destructive",
  },
];

const safeJsonParse = (jsonText: string): AIAnalysisResult | null => {
  try {
    if (!jsonText || jsonText.trim().length === 0) {
      throw new Error("Empty JSON string");
    }

    let cleaned = jsonText.trim();

    // ✅ ```json``` markdownı kaldır
    cleaned = cleaned.replace(/^```json\n?/i, "").replace(/\n?```$/i, "");
    cleaned = cleaned.replace(/^```\n?/i, "").replace(/\n?```$/i, "");

    // ✅ KESIK STRING'İ KONTROL ET
    // Eğer son karakter tırnak değilse (kesik string), tırnak ekle
    if (!cleaned.trim().endsWith("}")) {
      // Son field kesik kalmış, kapat
      if (cleaned.includes('"') && !cleaned.trim().endsWith('"')) {
        cleaned = cleaned.trim() + '" }';
      } else {
        cleaned = cleaned.trim() + " }";
      }
    }

    // Smart quotes düzelt
    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2015\u2013]/g, "-");

    // Eksik braces
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      cleaned += "}".repeat(openBraces - closeBraces);
    }

    // Trailing comma
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    console.log("🔧 Cleaned JSON:", cleaned.substring(0, 300));

    const parsed = JSON.parse(cleaned);

    return {
      description: parsed.description || "Açıklama alınamadı",
      riskDefinition: parsed.riskDefinition || "Risk tanımı alınamadı",
      correctiveAction: parsed.correctiveAction || "- İşlem belirtilmedi",
      preventiveAction: parsed.preventiveAction || "- Önlem belirtilmedi",
      importance_level: parsed.importance_level || "Normal",
    } as AIAnalysisResult;
  } catch (error) {
    console.error("❌ JSON Parse Error:", error);
    console.error("Raw text:", jsonText.substring(0, 300));
    return null;
  }
};

// ✅ DATA URL TO UINT8ARRAY (Buffer yerine)
const dataUrlToBuffer = (dataUrl: string): Uint8Array => {
  try {
    if (!dataUrl || !dataUrl.includes(",")) {
      throw new Error("Invalid data URL format");
    }

    // Base64 kısmını al
    const base64Data = dataUrl.split(",")[1];
    
    if (!base64Data) {
      throw new Error("No base64 data found");
    }

    // ✅ atob ile decode et
    const binaryString = atob(base64Data);
    
    // ✅ Uint8Array'e çevir
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    if (bytes.length === 0) {
      throw new Error("Empty buffer");
    }

    return bytes;
  } catch (error) {
    console.error("❌ Buffer conversion error:", error);
    throw error;
  }
};

// ✅ GENERATE WORD DOCUMENT - SUPABASE STORAGE'A YÜKLE
const generateWordDocument = async (
  entries: HazardEntry[],
  siteName: string,
  orgData: OrganizationData | null,
  user: any,
  orgId: string
) => {
  try {
    const today = new Date();
    const dateStr = today.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const sections: any[] = [];

    // ✅ HEADER SECTION
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "DÜZELTİCİ VE ÖNLEYİCİ FAALIYET FORMU (DÖF)",
                        bold: true,
                        size: 24,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                borders: {
                  top: { color: "000000", space: 1, style: "single", size: 12 },
                  bottom: {
                    color: "000000",
                    space: 1,
                    style: "single",
                    size: 12,
                  },
                  left: { color: "000000", space: 1, style: "single", size: 12 },
                  right: {
                    color: "000000",
                    space: 1,
                    style: "single",
                    size: 12,
                  },
                },
              }),
            ],
          }),
        ],
      })
    );

    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // ✅ INFO TABLE (Firma, Saha, Tarih, vb.)
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "FİRMA ADI",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: orgData?.name || "N/A",
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "KONUM",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: siteName || "N/A",
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "TARİH",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: dateStr,
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "İSG UYZMANI",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: user?.email || "N/A",
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "BULGULAR",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${entries.length} bulgu (${entries.filter((e) => e.ai_analyzed).length} AI analiz)`,
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // ✅ BİLDİRİM ŞEKLİ ROW
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "BİLDİRİM ŞEKLİ",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: { fill: "D3D3D3" },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: entries[0]?.notification_method || "E-mail", // ✅ İLK ENTRY'DEN AL
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    sections.push(new Paragraph({ children: [new TextRun("")] }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // ✅ FINDINGS WITH IMAGES
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];

      // MADDE BAŞLIĞI
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `MADDE ${index + 1} – UYGUNSUZLUK / RİSK`,
              bold: true,
              size: 24,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          shading: { fill: "000000" },
        })
      );

      const findingTableRows: TableRow[] = [];

      // ROW 1: BULGU AÇIKLAMASI
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "BULGU AÇIKLAMASI",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.description,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 2: RİSK TANIMI
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "RİSK TANIMI",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.riskDefinition,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 3: DÜZELTICI FAALIYET
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "DÜZELTICI FAALIYET",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.correctiveAction,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 4: ÖNLEYICI FAALIYET
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "ÖNLEYICI FAALIYET",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.preventiveAction,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 5: BÖLÜM
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "BÖLÜM",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.related_department,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 6: ÖNEMLİLİK
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "ÖNEMLİLİK",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.importance_level,
                      bold: true,
                      size: 18,
                      color:
                        entry.importance_level === "Kritik"
                          ? "FF0000"
                          : entry.importance_level === "Yüksek"
                          ? "FFA500"
                          : "008000",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ROW 7: TERMİN
      findingTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "TERMİN",
                      bold: true,
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "D3D3D3" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: new Date(entry.termin_date).toLocaleDateString(
                        "tr-TR"
                      ),
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })
      );

      // ✅ FOTOĞRAFLAR
      if (entry.media_urls.length > 0) {
        findingTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `FOTOĞRAFLAR (${entry.media_urls.length})`,
                        bold: true,
                        size: 20,
                        color: "FFFFFF",
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: "000000" },
                margins: { top: 100, bottom: 100 },
              }),
            ],
          })
        );

        for (let imgIdx = 0; imgIdx < entry.media_urls.length; imgIdx++) {
          try {
            const imageUrl = entry.media_urls[imgIdx];
            const uint8Array = dataUrlToBuffer(imageUrl);

            findingTableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: uint8Array as any,
                            type: "jpg",
                            transformation: {
                              width: 320,
                              height: 240,
                            },
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 },
                      }),
                    ],
                    margins: { top: 150, bottom: 80, left: 100, right: 100 },
                    shading: { fill: "FFFFFF" },
                  }),
                ],
              })
            );

            findingTableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Fotoğraf ${imgIdx + 1}/${entry.media_urls.length}`,
                            italics: true,
                            size: 18,
                            color: "666666",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                      }),
                    ],
                    margins: { top: 0, bottom: 120, left: 100, right: 100 },
                    shading: { fill: "F5F5F5" },
                  }),
                ],
              })
            );
          } catch (err) {
            console.error(`❌ Image error at index ${imgIdx}:`, err);
          }
        }
      }

      const findingTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: findingTableRows,
      });

      sections.push(findingTable);
      sections.push(new Paragraph({ children: [new TextRun("")] }));
      sections.push(
        new Paragraph({
          children: [new TextRun("")],
          spacing: { after: 400 },
        })
      );
    }

    // ✅ Create document
    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    });

    // ✅ Generate blob
    const blob = await Packer.toBlob(doc);

    // ✅ LOCAL İNDİR
    saveAs(blob, `DÖF_Raporu_${siteName}_${today.getTime()}.docx`);

    // ✅ SUPABASE STORAGE'A YÜKLE
    const fileName = `dof-reports/${orgId}/${siteName}_${today.toISOString()}.docx`;

    const { error: uploadError } = await supabase.storage
      .from("dof-reports")
      .upload(fileName, blob, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (uploadError) {
      console.warn("⚠️ Upload warning:", uploadError);
      toast.warning("⚠️ Dosya indirildi ama arşivlenemiyor");
    } else {
      // ✅ PUBLIC URL AL
      const { data } = supabase.storage
        .from("dof-reports")
        .getPublicUrl(fileName);

      // ✅ DATABASE'E KAYDET
      const { error: dbError } = await supabase.from("reports").insert({
        org_id: orgId,
        user_id: user?.id,
        title: `DÖF Raporu - ${siteName}`,
        report_type: "inspection",
        generated_at: today.toISOString(),
        export_format: "docx",
        file_url: data.publicUrl,
        content: {
          entries_count: entries.length,
          ai_analyzed_count: entries.filter((e) => e.ai_analyzed).length,
          location: siteName,
        },
      });

      if (dbError) {
        console.warn("⚠️ Database save warning:", dbError);
      } else {
        toast.success("✅ Rapor kaydedildi ve arşivlendi!");
      }
    }

    toast.success("✅ Profesyonel DÖF Raporu başarıyla indirildi!");
  } catch (error: any) {
    console.error("❌ Word generation error:", error);
    toast.error(`❌ Hata: ${error.message}`);
  }
};

// ✅ MAIN COMPONENT
export default function BulkCAPA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<HazardEntry[]>([]);
  const [siteName, setSiteName] = useState("");
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [newEntry, setNewEntry] = useState<HazardEntry>({
    id: "",
    description: "",
    riskDefinition: "",
    correctiveAction: "",
    preventiveAction: "",
    importance_level: "Normal",
    termin_date: "",
    related_department: "Diğer",
    notification_method: "E-mail", // ✅ DEFAULT DEĞER
    media_urls: [],
    ai_analyzed: false,
  });

  // ✅ AI IMAGE ANALYSIS
  const analyzeImageWithAI = async (
    imageUrl: string
  ): Promise<AIAnalysisResult | null> => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      const model = import.meta.env.VITE_GOOGLE_MODEL || "gemini-2.5-flash";

      if (!apiKey) {
        throw new Error("Google API Key not configured");
      }

      let imageData: string;
      let mediaType = "image/jpeg";

      if (imageUrl.startsWith("data:")) {
        const matches = imageUrl.match(/data:([^;]+);base64,(.+)/);
        if (!matches) {
          throw new Error("Invalid data URL format");
        }
        mediaType = matches[1];
        imageData = matches[2];
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        mediaType = blob.type || "image/jpeg";
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        imageData = btoa(binary);
      }

     const enhancedPrompt = `İşyeri güvenliği ve sağlığı (İSG) uzmanı olarak, görseldeki tehlikeleri analiz edin.

⚠️ KRITIK TALIMATLAR - KESIN OLARAK UYUN:
- Yanıt SADECE GEÇERLI bir JSON objesi olmalı
- JSON asla yarıda kesilmemeli - her zaman TAMAMLANMALI
- Tüm tırnak işaretleri ve parantezler KAPATILMALI
- Markdown YOK, kod blokları YOK, ekstra metin YOK
- Yanıt { ile başlayıp } ile BİTMELİDİR
- "undefined" YAZILMAMALI
- Tüm alanlar MUTLAKA doldurulmalı - boş bırakmayın
- Türkçe ve NET cevaplar verin
- UZUN ve DETAYLı cevaplar verin (en az 2-3 cümle her alan)

EXACTLY şu yapı döndürün:

{
  "description": "Açık, net ve profesyonel bulgu açıklaması (2-3 tam cümle Türkçe)",
  "riskDefinition": "Riski açıkça tanımlayan, sonuçlarını vurgulayan açıklama (2-3 tam cümle Türkçe)",
  "correctiveAction": "Hemen yapılması gereken faaliyetler:\n- Madde 1\n- Madde 2\n- Madde 3",
  "preventiveAction": "İleride önlemek için alınacak faaliyetler:\n- Madde 1\n- Madde 2\n- Madde 3",
  "importance_level": "Normal"
}

UYARI: Her alan MUTLAKA doldurulmalı. "undefined" veya boş değer YASAK!

Eğer görüntüde İSG riski yoksa:

{
  "description": "Görüntüde belirgin bir iş güvenliği riski tespit edilmemiştir. Çalışma ortamı güvenli görünmektedir.",
  "riskDefinition": "Acil bir risk bulunmamaktadır.",
  "correctiveAction": "Uygulanacak özel faaliyet bulunmamaktadır.",
  "preventiveAction": "Genel iş güvenliği uygulamalarına uyulmalıdır.",
  "importance_level": "Normal"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: enhancedPrompt,
                  },
                  {
                    inline_data: {
                      mime_type: mediaType,
                      data: imageData,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              top_p: 0.95,
              top_k: 40,
              max_output_tokens: 4016,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error:", errorData);
        throw new Error(
          `Gemini API error: ${errorData.error?.message || response.statusText}`
        );
      }

      const result = await response.json();
      const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("No text response from Gemini");
      }

      console.log("📝 Raw response:", textContent.substring(0, 300));

      const analysis = safeJsonParse(textContent);

      if (!analysis) {
        throw new Error("Could not parse AI response as JSON");
      }

      console.log("✅ Successfully parsed:", analysis);
      return analysis;
    } catch (error) {
      console.error("❌ AI Analysis error:", error);
      return null;
    }
  };

  // ✅ FETCH ORGANIZATION DATA
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name, slug") // ✅ id EKLE
            .eq("id", profile.organization_id)
            .single();

          if (org) {
            setOrgData(org); // ✅ Artık id var
          }
        }
      } catch (error) {
        console.error("Error fetching org data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [user]);
  // ✅ AI ANALYSIS HANDLER
  const handleAIAnalysis = async () => {
    if (newEntry.media_urls.length === 0) {
      toast.error("Lütfen en az bir fotoğraf yükleyin");
      return;
    }

    setAnalyzing(true);

    try {
      toast.info("🤖 Fotoğraflar analiz ediliyor...");

      const analyses: AIAnalysisResult[] = [];

      for (let i = 0; i < newEntry.media_urls.length; i++) {
        const analysis = await analyzeImageWithAI(newEntry.media_urls[i]);
        if (analysis) {
          analyses.push(analysis);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (analyses.length === 0) {
        throw new Error("Fotoğraflar analiz edilemedi");
      }

      const mergedAnalysis = mergeAnalyses(analyses);

      setNewEntry((prev) => ({
        ...prev,
        description: mergedAnalysis.description,
        riskDefinition: mergedAnalysis.riskDefinition,
        correctiveAction: mergedAnalysis.correctiveAction,
        preventiveAction: mergedAnalysis.preventiveAction,
        importance_level: mergedAnalysis.importance_level,
        ai_analyzed: true,
      }));

      toast.success("✅ Fotoğraflar başarıyla analiz edildi!");
    } catch (error: any) {
      toast.error(`❌ AI Analizi başarısız: ${error.message}`);
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  // ✅ MERGE ANALYSES
  const mergeAnalyses = (analyses: AIAnalysisResult[]): AIAnalysisResult => {
    const importancePriority = { Kritik: 3, Yüksek: 2, Normal: 1 };
    const maxImportance = analyses.reduce((max, curr) => {
      const currPriority = importancePriority[curr.importance_level] || 0;
      const maxPriority = importancePriority[max.importance_level] || 0;
      return currPriority > maxPriority ? curr : max;
    });

    return {
      description: analyses[0].description,
      riskDefinition: analyses
        .map((a, i) => `${i + 1}. ${a.riskDefinition}`)
        .join("\n"),
      correctiveAction: analyses
        .map((a, i) => `${i + 1}. ${a.correctiveAction}`)
        .join("\n"),
      preventiveAction: analyses
        .map((a, i) => `${i + 1}. ${a.preventiveAction}`)
        .join("\n"),
      importance_level: maxImportance.importance_level,
    };
  };

  // ✅ DRAG & DROP
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  };

  // ✅ PROCESS FILES
  const processFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Lütfen sadece görüntü dosyası seçin");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Dosya boyutu 5MB'ı aşamaz");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setNewEntry((prev) => ({
          ...prev,
          media_urls: [...prev.media_urls, dataUrl],
        }));
        toast.success("📷 Fotoğraf eklendi");
      };
      reader.readAsDataURL(file);
    });
  };

  // ✅ HANDLE IMAGE UPLOAD
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ REMOVE IMAGE
  const handleRemoveImage = (index: number) => {
    setNewEntry((prev) => ({
      ...prev,
      media_urls: prev.media_urls.filter((_, i) => i !== index),
      ai_analyzed: false,
    }));
  };

  // ✅ CREATE TABLE CELL
  const createCell = (text: string, isBold = false) => {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              bold: isBold,
              size: 20,
            }),
          ],
        }),
      ],
    });
  };

  // ✅ ADD ENTRY
  const handleAddEntry = () => {
    if (!newEntry.description.trim()) {
      toast.error("Lütfen bulgu açıklaması girin");
      return;
    }

    if (!newEntry.riskDefinition.trim()) {
      toast.error("Lütfen risk tanımını girin");
      return;
    }

    if (!newEntry.correctiveAction.trim()) {
      toast.error("Lütfen düzeltici faaliyeti girin");
      return;
    }

    if (!newEntry.preventiveAction.trim()) {
      toast.error("Lütfen önleyici faaliyeti girin");
      return;
    }

    if (!newEntry.termin_date) {
      toast.error("Lütfen termin tarihini seçin");
      return;
    }

    const entry: HazardEntry = {
      ...newEntry,
      id: `entry-${Date.now()}`,
    };

    setEntries([...entries, entry]);

    setNewEntry({
      id: "",
      description: "",
      riskDefinition: "",
      correctiveAction: "",
      preventiveAction: "",
      importance_level: "Normal",
      termin_date: "",
      related_department: "Diğer",
      notification_method: "E-mail", 
      media_urls: [],
      ai_analyzed: false,
    });
    toast.success("✅ Bulgu eklendi");
  };

  // ✅ DELETE ENTRY
  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    toast.info("Bulgu silindi");
  };


const handleSaveAndExport = async () => {
  if (!siteName.trim()) {
    toast.error("Lütfen saha adını girin");
    return;
  }

  if (entries.length === 0) {
    toast.error("Lütfen en az bir bulgu ekleyin");
    return;
  }

  setSaving(true);

  try {
    if (user) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          // BulkCAPA.tsx içinde handleSaveAndExport fonksiyonu
          const { data: inspection, error: inspectionError } = await supabase
            .from("inspections")
            .insert({
              org_id: profile.organization_id,
              user_id: user.id,
              location_name: siteName,
              status: "completed",
              risk_level: "high",
              media_urls: entries.flatMap(e => e.media_urls),
              // ✅ YENİ ALANLAR
              notes: `Bulk CAPA Formu - ${entries.length} bulgu (AI Analiz)`,
              risk_definition: entries.map((e, i) => `${i + 1}. ${e.riskDefinition}`).join('\n\n'),
              corrective_action: entries.map((e, i) => `${i + 1}. ${e.correctiveAction}`).join('\n\n'),
              preventive_action: entries.map((e, i) => `${i + 1}. ${e.preventiveAction}`).join('\n\n'),
              created_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (!inspectionError && inspection) {
            for (const entry of entries) {
              await supabase.from("findings").insert({
                inspection_id: inspection.id,
                user_id: user.id,
                description: entry.description,
                action_required: entry.correctiveAction,
                risk_definition: entry.riskDefinition, // ✅ YENİ
                preventive_action: entry.preventiveAction, // ✅ YENİ
                due_date: entry.termin_date,
                priority:
                  entry.importance_level === "Kritik"
                    ? "critical"
                    : entry.importance_level === "Yüksek"
                    ? "high"
                    : "medium",
                notification_method: entry.notification_method,
              });
            }
            toast.success("✅ Veriler kaydedildi");
          }
        }
      } catch (dbError) {
        console.warn("Database save failed, continuing with Word export:", dbError);
      }
    }

    if (orgData && orgData.id) {
      await generateWordDocument(
        entries,
        siteName,
        orgData,
        user,
        orgData.id
      );
      
      // ✅ FORMU TEMIZLE
      setEntries([]);
      setSiteName("");
      setNewEntry({
        id: "",
        description: "",
        riskDefinition: "",
        correctiveAction: "",
        preventiveAction: "",
        importance_level: "Normal",
        termin_date: "",
        related_department: "Diğer",
        notification_method: "E-mail",
        media_urls: [],
        ai_analyzed: false,
      });
      
      // ✅ TOAST VE YÖNLENDIR
      toast.success("✅ DÖF Raporu başarıyla oluşturuldu!");
      
      // 2 saniye sonra Reports sayfasına git
      setTimeout(() => {
        navigate("/inspections");
      }, 2000);
    } else {
      toast.error("❌ Organization data not available");
    }
  } catch (error: any) {
    console.error("❌ Error:", error);
    toast.error(`❌ Hata: ${error.message}`);
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          📋 Bulk CAPA Formu
          <Sparkles className="h-8 w-8 text-yellow-500" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI Destekli Düzeltici ve Önleyici Faaliyet Planı Oluştur
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="glass-card p-8 border border-primary/20 space-y-8">
        {/* SITE INFO */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-foreground">
            🏭 Saha/Tesisis Adı
          </Label>
          <Input
            placeholder="Örn: Ankara Üretim Fabrikası"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="bg-secondary/50 border-border/50 h-11"
          />
          
          {/* ✅ UYARI MESAJI */}
          {entries.length > 0 && !siteName.trim() && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  ⚠️ Saha Adı Gerekli
                </p>
                <p className="text-xs text-amber-600 leading-relaxed mt-1">
                  "Kaydet ve Word İndir" butonunu etkinleştirmek için saha/tesis adını girmelisiniz.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NEW ENTRY FORM */}
        <div className="border border-border/50 rounded-lg p-6 space-y-6 bg-secondary/20">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Yeni Bulgu Ekle
          </h3>

          {/* AI INFO BOX */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-700">
                🤖 AI Analizi Kullan
              </p>
              <p className="text-xs text-blue-600 leading-relaxed mt-1">
                Fotoğraf yükle → "AI ile Analiz Et" tıkla → Tüm alanlar
                otomatik doldurulacak
              </p>
            </div>
          </div>

          {/* DRAG & DROP */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Fotoğraflar (Zorunlu)
            </Label>

            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-border/50 bg-secondary/30 hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="space-y-3">
                <div className="flex justify-center">
                  {dragActive ? (
                    <Cloud className="h-12 w-12 text-primary animate-bounce" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {dragActive
                      ? "Fotoğrafları buraya bırakın"
                      : "Fotoğraf Yükle"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dragActive
                      ? "Fotoğraflar yüklenecek"
                      : "Sürükle-bırak veya dosya seç (Max 5MB)"}
                  </p>
                </div>

                {!dragActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Upload className="h-3 w-3 mr-2" />
                    Dosya Seç
                  </Button>
                )}
              </div>
            </div>

            {/* IMAGE PREVIEW */}
            {newEntry.media_urls.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {newEntry.media_urls.length} fotoğraf yüklendi
                  </p>
                  {!newEntry.ai_analyzed && (
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={
                        analyzing || newEntry.media_urls.length === 0
                      }
                      className="gap-2 h-9 text-sm gradient-primary border-0 text-foreground font-semibold"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analiz ediliyor...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          AI ile Analiz Et
                        </>
                      )}
                    </Button>
                  )}
                  {newEntry.ai_analyzed && (
                    <div className="flex items-center gap-1 text-xs px-3 py-2 rounded bg-success/10 text-success font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      AI Analiz Tamamlandı
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {newEntry.media_urls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${idx}`}
                        className="w-full h-24 object-cover rounded-lg border border-border shadow-sm"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-destructive text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FORM FIELDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-6 border-t border-border">
            {/* Description */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Bulgu Açıklaması *
                {newEntry.ai_analyzed && (
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                )}
              </Label>
              <Textarea
                placeholder="Uygunsuzluğu / Riski açıklayın... (AI analiz sonrasında otomatik doldurulur)"
                value={newEntry.description}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    description: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 min-h-28 resize-none"
              />
            </div>

            {/* Risk Definition */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Risk Tanımı *
                {newEntry.ai_analyzed && (
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                )}
              </Label>
              <Textarea
                placeholder="Riskin ne olduğunu ve sonuçlarını açıklayın... (AI analiz sonrasında otomatik doldurulur)"
                value={newEntry.riskDefinition}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    riskDefinition: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 min-h-24 resize-none"
              />
            </div>

            {/* Corrective Action */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                🔧
                Düzeltici Faaliyet *
                {newEntry.ai_analyzed && (
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                )}
              </Label>
              <Textarea
                placeholder="Mevcut sorunu çözmek için alınacak adımlar... (AI analiz sonrasında otomatik doldurulur)"
                value={newEntry.correctiveAction}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    correctiveAction: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 min-h-24 resize-none"
              />
            </div>

            {/* Preventive Action */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                ✅
                Önleyici Faaliyet *
                {newEntry.ai_analyzed && (
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                )}
              </Label>
              <Textarea
                placeholder="Aynı sorunun tekrar olmasını önlemek için alınacak adımlar... (AI analiz sonrasında otomatik doldurulur)"
                value={newEntry.preventiveAction}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    preventiveAction: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 min-h-24 resize-none"
              />
            </div>

            {/* Importance Level */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Önemlilik Seviyesi
              </Label>
              <Select
                value={newEntry.importance_level || "Normal"}
                onValueChange={(value: any) =>
                  setNewEntry({
                    ...newEntry,
                    importance_level: value,
                  })
                }
              >
                <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {IMPORTANCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                İlgili Bölüm
              </Label>
              <Select
                value={newEntry.related_department || "Diğer"}
                onValueChange={(value) =>
                  setNewEntry({
                    ...newEntry,
                    related_department: value,
                  })
                }
              >
                <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Termin Tarihi *
              </Label>
              <Input
                type="date"
                value={newEntry.termin_date}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    termin_date: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 h-11"
              />
            </div>

            {/* ✅ Notification Method - TEXT INPUT */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                📢 Bildirim Şekli
              </Label>
              <Input
                placeholder="Örn: E-mail, SMS, Telefon, Yüz Yüze, vb..."
                value={newEntry.notification_method || ""}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    notification_method: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border/50 h-11"
              />
            </div>
          </div>

          {/* ADD BUTTON */}
          <Button
            onClick={handleAddEntry}
            className="w-full gap-2 gradient-primary border-0 text-foreground font-semibold h-12"
          >
            <Plus className="h-5 w-5" />
            Bulgayı Ekle
          </Button>
        </div>
        {/* ENTRIES LIST */}
        {entries.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              📑 Eklenen Bulgular ({entries.length})
            </h3>

            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="glass-card p-4 border border-border/50 space-y-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground flex items-center gap-2">
                        MADDE {idx + 1}:{" "}
                        {entry.description.substring(0, 50)}...
                        {entry.ai_analyzed && (
                          <Sparkles className="h-4 w-4 text-yellow-500 shrink-0" />
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${
                            IMPORTANCE_LEVELS.find(
                              (l) => l.value === entry.importance_level
                            )?.color
                          }`}
                        >
                          {entry.importance_level}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-secondary/50 text-muted-foreground">
                          {entry.related_department}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600">
                          📅{" "}
                          {new Date(entry.termin_date).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                        
                        {entry.media_urls.length > 0 && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-600">
                            📷 {entry.media_urls.length}
                          </span>
                        )}
                        {/* ✅ YENİ */}
                        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600">
                          📢 {entry.notification_method || "E-mail"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="gap-2 flex-1 h-11"
            onClick={() => setPreviewOpen(true)}
            disabled={entries.length === 0}
          >
            <Eye className="h-4 w-4" />
            Önizleme
          </Button>
          <Button
            onClick={handleSaveAndExport}
            disabled={saving || entries.length === 0 || siteName.trim() === ""}
            className={`gap-2 flex-1 border-0 text-foreground font-semibold h-11 ${
              saving || entries.length === 0 || siteName.trim() === ""
                ? "bg-gray-500 cursor-not-allowed opacity-50"
                : "gradient-primary"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Kaydet ve Word İndir
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PREVIEW MODAL - FIXED WITH IMAGE GALLERY */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full p-6 space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Rapor Önizlemesi
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </h2>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* SUMMARY */}
              <div className="bg-secondary/50 p-4 rounded space-y-2">
                <p>
                  <strong>Firma:</strong> {orgData?.name}
                </p>
                <p>
                  <strong>Saha:</strong> {siteName}
                </p>
                <p>
                  <strong>Toplam Bulgular:</strong> {entries.length}
                </p>
                <p>
                  <strong>AI Analiz:</strong>{" "}
                  {entries.filter((e) => e.ai_analyzed).length} /{" "}
                  {entries.length}
                </p>
              </div>

              {/* ENTRIES WITH IMAGE GALLERY */}
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="border border-border/50 rounded-lg p-4 space-y-4"
                >
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    MADDE {idx + 1} – UYGUNSUZLUK / RİSK
                    {entry.ai_analyzed && (
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    )}
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-sm line-clamp-3">
                      <strong>Bulgu:</strong> {entry.description}
                    </p>
                    <p className="text-sm">
                      <strong>Önemlilik:</strong> {entry.importance_level}
                    </p>
                    <p className="text-sm">
                      <strong>Bölüm:</strong> {entry.related_department}
                    </p>
                    <p className="text-sm">
                      <strong>Termin:</strong>{" "}
                      {new Date(entry.termin_date).toLocaleDateString("tr-TR")}
                    </p>
                  </div>

                  {/* ✅ IMAGE GALLERY */}
                  {entry.media_urls.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <p className="text-sm font-semibold">
                        📷 Fotoğraflar ({entry.media_urls.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {entry.media_urls.map((imageUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative group rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow"
                          >
                            <img
                              src={imageUrl}
                              alt={`Fotoğraf ${imgIdx + 1}`}
                              className="w-full h-32 object-cover hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                {imgIdx + 1}/{entry.media_urls.length}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={() => setPreviewOpen(false)}
              className="w-full"
              variant="outline"
            >
              Kapat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}