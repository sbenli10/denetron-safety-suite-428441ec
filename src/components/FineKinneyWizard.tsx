import { useState, useMemo } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const probabilityOptions = [
  { value: "0.1", label: "0.1 — Virtually impossible" },
  { value: "0.2", label: "0.2 — Practically impossible" },
  { value: "0.5", label: "0.5 — Conceivable but unlikely" },
  { value: "1", label: "1 — Unlikely but possible" },
  { value: "3", label: "3 — Unusual" },
  { value: "6", label: "6 — Quite possible" },
  { value: "10", label: "10 — Expected" },
];

const severityOptions = [
  { value: "1", label: "1 — First aid (minor)" },
  { value: "3", label: "3 — Significant injury" },
  { value: "7", label: "7 — Serious injury (hospitalization)" },
  { value: "15", label: "15 — Single fatality" },
  { value: "40", label: "40 — Multiple fatalities" },
  { value: "100", label: "100 — Catastrophe" },
];

const frequencyOptions = [
  { value: "0.5", label: "0.5 — Very rare (yearly)" },
  { value: "1", label: "1 — Rare (few times/year)" },
  { value: "2", label: "2 — Occasional (monthly)" },
  { value: "3", label: "3 — Frequent (weekly)" },
  { value: "6", label: "6 — Continuous (daily)" },
  { value: "10", label: "10 — Continuous (hourly)" },
];

interface RiskLevel {
  label: string;
  className: string;
  description: string;
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return { label: "Acceptable", className: "bg-success/15 text-success border-success/30", description: "Risk is acceptable. No immediate action needed." };
  if (score <= 70) return { label: "Possible", className: "bg-blue-500/15 text-blue-400 border-blue-500/30", description: "Attention required. Monitor and review periodically." };
  if (score <= 200) return { label: "Substantial", className: "bg-warning/15 text-warning border-warning/30", description: "Correction required. Plan mitigation actions." };
  if (score <= 400) return { label: "High", className: "bg-orange-500/15 text-orange-400 border-orange-500/30", description: "Immediate correction needed. Prioritize mitigation." };
  return { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30", description: "Stop activity immediately. Critical intervention required." };
}

export function FineKinneyWizard() {
  const [probability, setProbability] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("");

  const result = useMemo(() => {
    if (!probability || !severity || !frequency) return null;
    const score = parseFloat(probability) * parseFloat(severity) * parseFloat(frequency);
    return { score, level: getRiskLevel(score) };
  }, [probability, severity, frequency]);

  const reset = () => {
    setProbability("");
    setSeverity("");
    setFrequency("");
  };

  return (
    <div className="glass-card p-5 glow-primary animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Calculator className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fine-Kinney Risk Assessment</h3>
            <p className="text-xs text-muted-foreground">Risk = Probability × Severity × Frequency</p>
          </div>
        </div>
        {result && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Probability</Label>
          <Select value={probability} onValueChange={setProbability}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {probabilityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {severityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {frequencyOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg border p-4 space-y-2 animate-fade-in ${result.level.className}`}>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Risk Score: {result.score.toFixed(1)}</span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-background/20">
              {result.level.label}
            </span>
          </div>
          <p className="text-sm opacity-90">{result.level.description}</p>
          <p className="text-xs opacity-70">
            {probability} × {severity} × {frequency} = {result.score.toFixed(1)}
          </p>
        </div>
      )}
    </div>
  );
}
