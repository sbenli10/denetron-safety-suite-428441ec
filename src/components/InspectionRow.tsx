import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";

export type InspectionStatus = "completed" | "in-progress" | "overdue" | "scheduled";

interface InspectionRowProps {
  id: string;
  site: string;
  inspector: string;
  date: string;
  status: InspectionStatus;
  riskLevel: "low" | "medium" | "high" | "critical";
  score?: number;
  photoUrl?: string | null;
}

const statusStyles: Record<InspectionStatus, string> = {
  completed: "bg-success/15 text-success border-success/20",
  "in-progress": "bg-info/15 text-info border-info/20",
  overdue: "bg-destructive/15 text-destructive border-destructive/20",
  scheduled: "bg-muted text-muted-foreground border-border",
};

const riskStyles: Record<string, string> = {
  low: "bg-success/15 text-success border-success/20",
  medium: "bg-warning/15 text-warning border-warning/20",
  high: "bg-destructive/15 text-destructive border-destructive/20",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

export function InspectionRow({ id, site, inspector, date, status, riskLevel, score, photoUrl }: InspectionRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {photoUrl ? (
          <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border/50 bg-secondary/30">
            <img
              src={photoUrl}
              alt="Saha fotoğrafı"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="shrink-0 w-12 h-12 rounded-lg border border-border/50 bg-secondary/30 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
        <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{id}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{site}</p>
          <p className="text-xs text-muted-foreground">{inspector} · {date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {score !== undefined && (
          <span className="text-sm font-semibold text-foreground">{score}%</span>
        )}
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${riskStyles[riskLevel]}`}>
          {riskLevel}
        </Badge>
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${statusStyles[status]}`}>
          {status}
        </Badge>
      </div>
    </div>
  );
}
