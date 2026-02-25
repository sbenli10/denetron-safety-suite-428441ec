import { useState } from "react";
import { Brain, FileText, CheckCircle, Clock, AlertTriangle, Download, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface AiResult {
  riskScore: "Low" | "Medium" | "High";
  correctionPlan: string;
  justification: string;
  complianceScore: number;
  complianceNotes: string;
}

const riskColors: Record<string, string> = {
  Low: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
};

const reports = [
  {
    id: "RPT-001",
    title: "Monthly Safety Performance — January 2026",
    type: "AI Summary",
    date: "Feb 01, 2026",
    status: "generated",
    summary: "Overall compliance improved by 6% with 94% risk score. Three critical hazards resolved in chemical plant sector. Recommended additional PPE training for Zone B team.",
  },
  {
    id: "RPT-002",
    title: "Hazard Trend Analysis — Q4 2025",
    type: "Trend Report",
    date: "Jan 15, 2026",
    status: "generated",
    summary: "Decreasing trend in high-risk incidents. Fall hazards reduced 40% after new guardrail installations. Electrical hazards remain area of concern in manufacturing units.",
  },
  {
    id: "RPT-003",
    title: "Construction Site Gamma — Incident Review",
    type: "Incident Report",
    date: "Feb 22, 2026",
    status: "pending",
    summary: "Pending AI analysis of recent high-risk findings at Construction Site Gamma. Expected completion within 2 hours.",
  },
  {
    id: "RPT-004",
    title: "Annual Compliance Audit 2025",
    type: "Audit Report",
    date: "Jan 05, 2026",
    status: "generated",
    summary: "Full compliance audit covering 156 inspections across 12 facilities. Overall score: 91.3%. Three facilities flagged for corrective action plans.",
  },
];

const statusIcon: Record<string, typeof CheckCircle> = {
  generated: CheckCircle,
  pending: Clock,
};

export default function Reports() {
  const [hazardInput, setHazardInput] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeHazard = async () => {
    if (!hazardInput.trim()) {
      toast.error("Please describe a safety hazard first.");
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-hazard", {
        body: { hazardDescription: hazardInput.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data as AiResult);
      toast.success("AI analysis complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to analyze hazard.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!aiResult) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Denetron Safety Suite", 20, 20);
    doc.setFontSize(14);
    doc.text("AI Hazard Correction Report", 20, 30);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 20, 40);

    doc.setDrawColor(100);
    doc.line(20, 44, 190, 44);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Hazard Description:", 20, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const hazardLines = doc.splitTextToSize(hazardInput, 170);
    doc.text(hazardLines, 20, 62);

    let y = 62 + hazardLines.length * 5 + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Risk Score: ${aiResult.riskScore}`, 20, y);
    y += 8;
    doc.text(`OHS Compliance Score: ${aiResult.complianceScore}/100`, 20, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const complianceLines = doc.splitTextToSize(aiResult.complianceNotes, 170);
    doc.text(complianceLines, 20, y);
    y += complianceLines.length * 5 + 10;

    const justLines = doc.splitTextToSize(aiResult.justification, 170);
    doc.text(justLines, 20, y);
    y += justLines.length * 5 + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Correction Plan:", 20, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const planLines = doc.splitTextToSize(aiResult.correctionPlan, 170);
    doc.text(planLines, 20, y);

    doc.save(`hazard-report-${Date.now()}.pdf`);
    toast.success("PDF report downloaded!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated insights powered by AI analysis</p>
        </div>
      </div>

      {/* AI Hazard Analyzer */}
      <div className="glass-card p-5 glow-primary animate-fade-in space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Brain className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Hazard Analyzer</h3>
            <p className="text-xs text-muted-foreground">Describe a safety hazard to get an AI-generated correction plan and risk score</p>
          </div>
        </div>

        <Textarea
          placeholder="e.g. Workers observed operating a forklift without seatbelts in the warehouse loading zone. No safety barriers between pedestrian walkways and forklift routes."
          value={hazardInput}
          onChange={(e) => setHazardInput(e.target.value)}
          className="min-h-[100px] bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
        />

        <div className="flex gap-3">
          <Button
            onClick={analyzeHazard}
            disabled={loading || !hazardInput.trim()}
            className="gap-2 gradient-primary border-0 text-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Analyze Hazard"}
          </Button>

          {aiResult && (
            <Button onClick={generatePDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Generate PDF Report
            </Button>
          )}
        </div>

        {/* AI Result */}
        {aiResult && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${riskColors[aiResult.riskScore]}`}>
                <AlertTriangle className="h-4 w-4" />
                Risk: {aiResult.riskScore}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
                aiResult.complianceScore >= 70 ? "bg-success/15 text-success" :
                aiResult.complianceScore >= 40 ? "bg-warning/15 text-warning" :
                "bg-destructive/15 text-destructive"
              }`}>
                <ShieldCheck className="h-4 w-4" />
                OHS Compliance: {aiResult.complianceScore}/100
              </span>
              <span className="text-xs text-muted-foreground italic">{aiResult.justification}</span>
            </div>

            <div className="glass-card p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                OHS Compliance Notes
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.complianceNotes}</p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Correction Plan</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {aiResult.correctionPlan}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Existing Report Cards */}
      <div className="grid gap-4">
        {reports.map((report) => {
          const StatusIcon = statusIcon[report.status] || CheckCircle;
          return (
            <div key={report.id} className="glass-card p-5 animate-fade-in hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{report.title}</h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        report.status === "generated"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}>
                        <StatusIcon className="h-3 w-3" />
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{report.type} · {report.date}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">{report.summary}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
