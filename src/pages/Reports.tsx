import { Brain, FileText, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated insights powered by AI analysis</p>
        </div>
        <Button size="sm" className="gap-2 gradient-primary border-0 text-foreground">
          <Brain className="h-4 w-4" /> Generate Report
        </Button>
      </div>

      {/* AI Insight Banner */}
      <div className="glass-card p-5 glow-primary animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Brain className="h-5 w-5 text-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">AI Safety Insight</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on the last 30 days of inspection data, your highest risk area is <span className="text-warning font-medium">electrical hazards in Manufacturing Unit Delta</span>.
              We recommend scheduling a focused audit and updating the lockout/tagout procedures. Overall safety trend is <span className="text-success font-medium">improving (+6%)</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Report Cards */}
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
