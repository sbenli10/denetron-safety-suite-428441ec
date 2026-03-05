// ====================================================
// AI RISK ANALYSIS SERVICE
// ====================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

// Types
export interface RiskHazard {
  hazard: string;
  risk: string;
  preventiveMeasures: string[];
}

export interface RiskAnalysisResponse {
  risks: RiskHazard[];
}

export interface NaceRiskAnalysisParams {
  naceCode: string;
  sector: string;
  hazardClass: string;
  naceTitle?: string;
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

/**
 * Generate NACE-based occupational risk analysis using Google Gemini
 */
export async function generateNaceRiskAnalysis(
  params: NaceRiskAnalysisParams
): Promise<RiskAnalysisResponse> {
  const { naceCode, sector, hazardClass, naceTitle } = params;

  // Select model based on hazard class
  const modelName =
    hazardClass === "Çok Tehlikeli"
      ? import.meta.env.VITE_GOOGLE_MODEL_ROBUST
      : import.meta.env.VITE_GOOGLE_MODEL;

  console.log(`🤖 Using model: ${modelName} for hazard class: ${hazardClass}`);

  const model = genAI.getGenerativeModel({ model: modelName });

  // Construct prompt
  const prompt = `You are a certified occupational safety expert specializing in Turkish workplace safety regulations.

Analyze the following sector based on NACE classification.

NACE Code: ${naceCode}
Sector: ${sector}
${naceTitle ? `Activity: ${naceTitle}` : ""}
Hazard Class: ${hazardClass}

Provide the 5 most common occupational hazards in this sector according to Turkish workplace safety standards (6331 sayılı İş Sağlığı ve Güvenliği Kanunu).

For each hazard, provide:
- hazard: Name of the hazard (in Turkish)
- risk: Detailed risk description (in Turkish, 2-3 sentences)
- preventiveMeasures: Array of 3-5 specific preventive measures (in Turkish)

Return ONLY valid JSON in this exact format:
{
  "risks": [
    {
      "hazard": "string",
      "risk": "string",
      "preventiveMeasures": ["string", "string", "string"]
    }
  ]
}

Do not include any markdown formatting, code blocks, or additional text. Return only the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Raw AI response:", text);

    // Clean response (remove markdown code blocks if present)
    let cleanedText = text.trim();

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/g, "");
    cleanedText = cleanedText.replace(/```\s*/g, "");
    cleanedText = cleanedText.trim();

    // Parse JSON
    const parsed: RiskAnalysisResponse = JSON.parse(cleanedText);

    // Validate structure
    if (!parsed.risks || !Array.isArray(parsed.risks)) {
      throw new Error("Invalid response structure: missing risks array");
    }

    // Validate each risk
    parsed.risks.forEach((risk, index) => {
      if (!risk.hazard || !risk.risk || !Array.isArray(risk.preventiveMeasures)) {
        throw new Error(`Invalid risk structure at index ${index}`);
      }
    });

    console.log("✅ AI analysis completed:", parsed.risks.length, "risks found");

    return parsed;
  } catch (error) {
    console.error("❌ AI Risk Analysis Error:", error);

    // Return fallback error structure
    throw new Error(
      `AI risk analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get model name being used for a given hazard class
 */
export function getModelForHazardClass(hazardClass: string): string {
  return hazardClass === "Çok Tehlikeli"
    ? import.meta.env.VITE_GOOGLE_MODEL_ROBUST
    : import.meta.env.VITE_GOOGLE_MODEL;
}

/**
 * Validate that required environment variables are set
 */
export function validateAIConfig(): boolean {
  const requiredVars = [
    "VITE_GOOGLE_API_KEY",
    "VITE_GOOGLE_MODEL",
    "VITE_GOOGLE_MODEL_ROBUST",
  ];

  const missing = requiredVars.filter((v) => !import.meta.env[v]);

  if (missing.length > 0) {
    console.error("❌ Missing environment variables:", missing);
    return false;
  }

  return true;
}