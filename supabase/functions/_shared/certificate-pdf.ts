import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4";
import { INTER_BOLD_BASE64, INTER_REGULAR_BASE64 } from "../../../src/utils/fonts.ts";
import { buildCertificateNumber, buildVerificationUrl, sanitizeFileName, type CertificateParticipant, type CertificateRecord } from "./certificate-utils.ts";

const assetCache = new Map<string, Uint8Array>();
const FONT_REGULAR_KEY = "inter-regular-base64";
const FONT_BOLD_KEY = "inter-bold-base64";

function normalizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getFontBytes(cacheKey: string, base64: string) {
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey)!;
  const bytes = base64ToUint8Array(base64);
  assetCache.set(cacheKey, bytes);
  return bytes;
}

async function fetchLogoBytes(logoUrl?: string | null) {
  if (!logoUrl) return null;
  if (assetCache.has(logoUrl)) return assetCache.get(logoUrl)!;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.error("certificate pdf logo fetch failed", { logoUrl, status: response.status });
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    assetCache.set(logoUrl, bytes);
    return bytes;
  } catch (error) {
    console.error("certificate pdf logo fetch error", { logoUrl, error: error instanceof Error ? error.message : error });
    return null;
  }
}

async function loadFonts(pdfDoc: PDFDocument) {
  try {
    pdfDoc.registerFontkit(fontkit);

    const [regularBytes, boldBytes] = await Promise.all([
      getFontBytes(FONT_REGULAR_KEY, INTER_REGULAR_BASE64),
      getFontBytes(FONT_BOLD_KEY, INTER_BOLD_BASE64),
    ]);

    console.log("certificate pdf fonts ready", {
      regularBytes: regularBytes.length,
      boldBytes: boldBytes.length,
      source: "embedded-base64",
    });

    const [bodyFont, titleFont] = await Promise.all([
      pdfDoc.embedFont(regularBytes),
      pdfDoc.embedFont(boldBytes),
    ]);

    return { bodyFont, titleFont };
  } catch (error) {
    console.error("certificate pdf font load failed", error);
    throw new Error(`Sertifika fontları yüklenemedi: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
  }
}

function frameColor(style: string) {
  if (style === "blue") return rgb(0.12, 0.33, 0.71);
  if (style === "green") return rgb(0.08, 0.45, 0.28);
  return rgb(0.72, 0.56, 0.17);
}

function drawHeader(page: any, titleFont: any, primary: any, certificate: CertificateRecord, participantName: string) {
  page.drawText("EĞİTİM SERTİFİKASI", { x: 230, y: 520, size: 26, font: titleFont, color: primary });
  page.drawText(normalizeText(certificate.certificate_type, "KATILIM").toUpperCase(), { x: 330, y: 490, size: 12, font: titleFont, color: primary });
  page.drawText(participantName, { x: 150, y: 410, size: 30, font: titleFont, color: rgb(0.08, 0.08, 0.08) });
}

async function drawLogo(pdfDoc: any, page: any, logoUrl?: string | null, x = 50, y = 470) {
  const logoBytes = await fetchLogoBytes(logoUrl);
  if (!logoBytes) return;
  try {
    const lowerUrl = logoUrl?.toLowerCase() || "";
    const logo = lowerUrl.includes("png") ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
    page.drawImage(logo, { x, y, width: 90, height: 70 });
  } catch (error) {
    console.error("certificate pdf logo embed failed", { logoUrl, error: error instanceof Error ? error.message : error });
  }
}

function drawQr(page: any, bodyFont: any, verificationCode?: string | null, x = 680, y = 55) {
  if (!verificationCode) return;

  const verificationUrl = buildVerificationUrl(verificationCode);
  const qr = qrcode(0, "M");
  qr.addData(verificationUrl);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const qrSize = 90;
  const quietZone = 4;
  const cellSize = qrSize / (moduleCount + quietZone * 2);

  page.drawRectangle({
    x,
    y,
    width: qrSize,
    height: qrSize,
    color: rgb(1, 1, 1),
  });

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue;
      page.drawRectangle({
        x: x + (col + quietZone) * cellSize,
        y: y + qrSize - (row + quietZone + 1) * cellSize,
        width: cellSize,
        height: cellSize,
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }

  page.drawText("QR ile doğrula", { x: x - 4, y: y - 14, size: 9, font: bodyFont, color: rgb(0.3, 0.3, 0.3) });
}

function drawClassicTheme(page: any, primary: any, width: number, height: number) {
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderWidth: 4, borderColor: primary });
  page.drawRectangle({ x: 36, y: 36, width: width - 72, height: height - 72, borderWidth: 1, borderColor: primary });
}

function drawModernTheme(page: any, primary: any, width: number, height: number) {
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.07, 0.11, 0.2) });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderWidth: 2, borderColor: primary });
  page.drawRectangle({ x: 24, y: 450, width: width - 48, height: 121, color: rgb(0.09, 0.18, 0.33), opacity: 0.92 });
  page.drawCircle({ x: 760, y: 530, size: 120, color: rgb(0.14, 0.38, 0.56), opacity: 0.25 });
  page.drawCircle({ x: 720, y: 70, size: 100, color: rgb(0.08, 0.7, 0.75), opacity: 0.15 });
}

function drawMinimalTheme(page: any, primary: any, width: number, height: number) {
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.985, 0.985, 0.98) });
  page.drawRectangle({ x: 50, y: 60, width: width - 100, height: height - 120, borderWidth: 1.5, borderColor: rgb(0.8, 0.82, 0.86) });
  page.drawRectangle({ x: 70, y: 495, width: 220, height: 6, color: primary });
}

function drawDetails(page: any, titleFont: any, bodyFont: any, primary: any, certificate: CertificateRecord, participant: CertificateParticipant, certificateNumber: string, companyLabel: string, isDark = false) {
  const trainerNames = normalizeStringArray(certificate.trainer_names);
  const details = [
    ["Katılımcı", normalizeText(participant.name, "Katılımcı")],
    ["Görev", normalizeText(participant.job_title, "Belirtilmedi")],
    ["Eğitim", normalizeText(certificate.training_name, "Eğitim Bilgisi Girilmedi")],
    ["Tarih", normalizeText(certificate.training_date, "Belirtilmedi")],
    ["Süre", normalizeText(certificate.training_duration, "Belirtilmedi")],
    ["Geçerlilik", normalizeText(certificate.validity_date, "Süresiz")],
    ["Sertifika No", normalizeText(certificateNumber, "Belirtilmedi")],
  ];

  let lineY = 308;
  for (const [label, value] of details) {
    page.drawText(`${label}:`, { x: 118, y: lineY, size: 12, font: titleFont, color: primary });
    page.drawText(value, { x: 245, y: lineY, size: 12, font: bodyFont, color: isDark ? rgb(0.92, 0.95, 0.99) : rgb(0.15, 0.15, 0.15) });
    lineY -= 24;
  }

  page.drawText(`Firma: ${normalizeText(companyLabel, "Firma Bilgisi Girilmedi")}`, { x: 118, y: 120, size: 12, font: bodyFont, color: isDark ? rgb(0.92, 0.95, 0.99) : rgb(0.15, 0.15, 0.15) });
  page.drawText(`Adres: ${normalizeText(certificate.company_address, "Belirtilmedi")}`, { x: 118, y: 100, size: 11, font: bodyFont, color: isDark ? rgb(0.82, 0.86, 0.91) : rgb(0.2, 0.2, 0.2), maxWidth: 520 });
  page.drawText(`Eğitmenler: ${trainerNames.join(", ") || "Belirtilmedi"}`, { x: 118, y: 80, size: 11, font: bodyFont, color: isDark ? rgb(0.82, 0.86, 0.91) : rgb(0.2, 0.2, 0.2), maxWidth: 520 });
}

export async function generateCertificatePdf(options: {
  certificate: CertificateRecord;
  participant: CertificateParticipant;
  participantIndex: number;
  companyLabel: string;
}) {
  try {
    const { certificate, participant, participantIndex, companyLabel } = options;
    const participantName = normalizeText(participant.name, "Katılımcı");
    const normalizedTrainingName = normalizeText(certificate.training_name, "egitim");
    const pdfDoc = await PDFDocument.create();
    const { bodyFont, titleFont } = await loadFonts(pdfDoc);
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();
    const primary = frameColor(normalizeText(certificate.frame_style, "gold"));
    const certificateNumber = normalizeText(participant.certificate_no) || buildCertificateNumber(certificate.id, participantIndex);

    if (certificate.template_type === "modern") {
      drawModernTheme(page, primary, width, height);
      await drawLogo(pdfDoc, page, certificate.logo_url, 56, 480);
      page.drawText("Kurumsal Eğitim Programı", { x: 120, y: 545, size: 12, font: bodyFont, color: rgb(0.8, 0.9, 0.98) });
      page.drawText("EĞİTİM SERTİFİKASI", { x: 220, y: 500, size: 26, font: titleFont, color: rgb(0.95, 0.98, 1) });
      page.drawText(participantName, { x: 150, y: 410, size: 30, font: titleFont, color: rgb(1, 1, 1) });
      page.drawText(`${normalizeText(companyLabel, "Firma Bilgisi Girilmedi")} tarafından düzenlenen ${normalizedTrainingName} eğitimini başarıyla tamamlamıştır.`, { x: 100, y: 365, size: 14, font: bodyFont, color: rgb(0.86, 0.9, 0.97), maxWidth: 650 });
      drawDetails(page, titleFont, bodyFont, rgb(0.45, 0.85, 0.96), certificate, participant, certificateNumber, companyLabel, true);
    } else if (certificate.template_type === "minimal") {
      drawMinimalTheme(page, primary, width, height);
      await drawLogo(pdfDoc, page, certificate.logo_url, 675, 485);
      page.drawText("Katılım Sertifikası", { x: 70, y: 530, size: 13, font: bodyFont, color: rgb(0.38, 0.42, 0.48) });
      page.drawText(participantName, { x: 70, y: 420, size: 32, font: titleFont, color: rgb(0.07, 0.11, 0.15) });
      page.drawText(normalizedTrainingName, { x: 70, y: 385, size: 16, font: titleFont, color: primary });
      page.drawText(`${normalizeText(companyLabel, "Firma Bilgisi Girilmedi")} tarafından yürütülen eğitim programını başarıyla tamamlamıştır.`, { x: 70, y: 355, size: 13, font: bodyFont, color: rgb(0.28, 0.31, 0.35), maxWidth: 640 });
      drawDetails(page, titleFont, bodyFont, primary, certificate, participant, certificateNumber, companyLabel, false);
    } else {
      drawClassicTheme(page, primary, width, height);
      await drawLogo(pdfDoc, page, certificate.logo_url, 50, 470);
      drawHeader(page, titleFont, primary, certificate, participantName);
      page.drawText(`${normalizeText(companyLabel, "Firma Bilgisi Girilmedi")} tarafından düzenlenen ${normalizedTrainingName} eğitimini başarıyla tamamlamıştır.`, { x: 100, y: 360, size: 14, font: bodyFont, color: rgb(0.2, 0.2, 0.2), maxWidth: 640 });
      drawDetails(page, titleFont, bodyFont, primary, certificate, participant, certificateNumber, companyLabel, false);
    }

    drawQr(page, bodyFont, normalizeText(participant.verification_code));
    page.drawText("Doğrulama: QR kodu okutun veya doğrulama sayfasını ziyaret edin.", { x: 520, y: 34, size: 8, font: bodyFont, color: certificate.template_type === "modern" ? rgb(0.88, 0.94, 1) : rgb(0.35, 0.35, 0.35) });
    page.drawLine({ start: { x: 120, y: 60 }, end: { x: 300, y: 60 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    page.drawLine({ start: { x: 500, y: 60 }, end: { x: 680, y: 60 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    page.drawText("Eğitmen İmzası", { x: 155, y: 42, size: 10, font: bodyFont, color: certificate.template_type === "modern" ? rgb(0.88, 0.94, 1) : rgb(0.25, 0.25, 0.25) });
    page.drawText("Firma Yetkilisi", { x: 540, y: 42, size: 10, font: bodyFont, color: certificate.template_type === "modern" ? rgb(0.88, 0.94, 1) : rgb(0.25, 0.25, 0.25) });

    return {
      bytes: await pdfDoc.save(),
      certificateNumber,
      fileName: `${sanitizeFileName(participantName)}-${sanitizeFileName(normalizedTrainingName)}.pdf`,
    };
  } catch (error) {
    console.error("generateCertificatePdf failed", {
      certificateId: options.certificate.id,
      participantId: options.participant.id,
      participantName: options.participant.name,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}
