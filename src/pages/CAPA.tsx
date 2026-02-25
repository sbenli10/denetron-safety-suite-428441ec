import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Brain,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
} from "lucide-react";
import { format } from "date-fns";

type CAPAStatus = "Open" | "In Progress" | "Closed";

interface CAPARecord {
  id: string;
  nonConformity: string;
  rootCause: string;
  correctiveAction: string;
  assignedPerson: string;
  deadline: string;
  status: CAPAStatus;
  createdAt: string;
  aiSuggestion?: string;
}

const AI_SUGGESTIONS: Record<string, string> = {
  fall: "Install guardrails and safety nets at elevated work areas. Conduct mandatory fall protection training for all workers. Implement daily harness inspection checklist.",
  chemical: "Review and update Material Safety Data Sheets (MSDS). Provide appropriate PPE (gloves, goggles, respirators). Install emergency eyewash stations and improve ventilation systems.",
  fire: "Inspect and service all fire extinguishers. Conduct fire drill training. Ensure all emergency exits are clearly marked and unobstructed. Review electrical wiring for faults.",
  noise: "Provide hearing protection equipment. Implement engineering controls to reduce noise at source. Conduct audiometric testing for exposed workers. Post warning signage in high-noise zones.",
  electrical: "Lock-out/Tag-out (LOTO) procedures must be enforced. Inspect all electrical panels and wiring. Provide insulated tools and PPE. Schedule regular electrical safety audits.",
  ergonomic: "Redesign workstations to reduce repetitive strain. Implement job rotation schedules. Provide ergonomic equipment (adjustable desks, chairs). Conduct ergonomic risk assessments.",
  dust: "Install local exhaust ventilation systems. Provide respiratory protection (N95/P100 masks). Implement wet suppression methods. Monitor airborne particulate levels regularly.",
  slip: "Apply anti-slip coatings to floors. Improve drainage systems. Post wet floor signage. Implement housekeeping schedule. Provide slip-resistant footwear.",
  confined: "Establish confined space entry permits. Test atmosphere before entry (O2, LEL, toxic gases). Assign a dedicated safety watch. Ensure rescue equipment is readily available.",
  machine: "Install machine guarding on all moving parts. Implement LOTO procedures for maintenance. Conduct operator training and certification. Schedule preventive maintenance inspections.",
};

function getAISuggestion(description: string): string {
  const lower = description.toLowerCase();
  for (const [keyword, suggestion] of Object.entries(AI_SUGGESTIONS)) {
    if (lower.includes(keyword)) return suggestion;
  }
  return "Conduct a thorough root cause analysis using the 5-Why method. Implement immediate containment actions to prevent recurrence. Schedule a review meeting with the safety team to develop a comprehensive corrective action plan. Document all findings and update the risk register accordingly.";
}

const initialData: CAPARecord[] = [
  {
    id: "CAPA-001",
    nonConformity: "Workers not wearing fall protection harnesses at elevated platforms above 2m",
    rootCause: "Insufficient training and missing equipment inventory",
    correctiveAction: "Mandatory fall protection training and daily harness checks",
    assignedPerson: "Mehmet Yılmaz",
    deadline: "2026-03-15",
    status: "In Progress",
    createdAt: "2026-02-10",
  },
  {
    id: "CAPA-002",
    nonConformity: "Chemical storage area lacks proper ventilation and MSDS signage",
    rootCause: "Ventilation system failure and outdated documentation",
    correctiveAction: "Repair ventilation, update all MSDS, install warning signs",
    assignedPerson: "Ayşe Demir",
    deadline: "2026-03-01",
    status: "Open",
    createdAt: "2026-02-18",
  },
  {
    id: "CAPA-003",
    nonConformity: "Fire extinguishers expired in Building C workshop",
    rootCause: "Missed maintenance schedule",
    correctiveAction: "Replace all expired extinguishers, set recurring inspection calendar",
    assignedPerson: "Ali Kaya",
    deadline: "2026-02-20",
    status: "Closed",
    createdAt: "2026-01-25",
  },
];

const statusConfig: Record<CAPAStatus, { color: string; icon: typeof Clock }> = {
  Open: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  "In Progress": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  Closed: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

export default function CAPA() {
  const [records, setRecords] = useState<CAPARecord[]>(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [nonConformity, setNonConformity] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [deadline, setDeadline] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");

  const handleAISuggest = () => {
    if (!nonConformity.trim()) {
      toast({ title: "Please enter a non-conformity description first", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const suggestion = getAISuggestion(nonConformity);
      setAiSuggestion(suggestion);
      setCorrectiveAction(suggestion);
      setIsGenerating(false);
      toast({ title: "AI Suggestion Generated", description: "Corrective action plan has been suggested." });
    }, 1200);
  };

  const handleSubmit = () => {
    if (!nonConformity || !rootCause || !correctiveAction || !assignedPerson || !deadline) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    const newRecord: CAPARecord = {
      id: `CAPA-${String(records.length + 1).padStart(3, "0")}`,
      nonConformity,
      rootCause,
      correctiveAction,
      assignedPerson,
      deadline,
      status: "Open",
      createdAt: format(new Date(), "yyyy-MM-dd"),
      aiSuggestion,
    };
    setRecords((prev) => [newRecord, ...prev]);
    setNonConformity("");
    setRootCause("");
    setCorrectiveAction("");
    setAssignedPerson("");
    setDeadline("");
    setAiSuggestion("");
    setDialogOpen(false);
    toast({ title: "CAPA Report Created", description: `${newRecord.id} has been created successfully.` });
  };

  const updateStatus = (id: string, status: CAPAStatus) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast({ title: "Status Updated", description: `${id} is now ${status}.` });
  };

  const openCount = records.filter((r) => r.status === "Open").length;
  const inProgressCount = records.filter((r) => r.status === "In Progress").length;
  const closedCount = records.filter((r) => r.status === "Closed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CAPA Management (DÖF)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Corrective and Preventive Actions — Track non-conformities and resolutions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New CAPA Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-primary" />
                Create New CAPA Report
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="nonConformity">Non-Conformity Description</Label>
                <Textarea
                  id="nonConformity"
                  placeholder="Describe the non-conformity or safety issue observed..."
                  value={nonConformity}
                  onChange={(e) => setNonConformity(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleAISuggest}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isGenerating ? "Analyzing..." : "AI Suggest Corrective Action"}
              </Button>

              {aiSuggestion && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                    <Brain className="h-3 w-3" /> AI Suggestion
                  </p>
                  <p className="text-sm text-muted-foreground">{aiSuggestion}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="rootCause">Root Cause Analysis</Label>
                <Textarea
                  id="rootCause"
                  placeholder="Identify the root cause using 5-Why or Fishbone analysis..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctiveAction">Corrective Action Plan</Label>
                <Textarea
                  id="correctiveAction"
                  placeholder="Describe the corrective and preventive actions to be taken..."
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedPerson">Assigned Person</Label>
                  <Input
                    id="assignedPerson"
                    placeholder="Full name"
                    value={assignedPerson}
                    onChange={(e) => setAssignedPerson(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleSubmit}>
                Create CAPA Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-amber-500/20">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/20">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{closedCount}</p>
              <p className="text-xs text-muted-foreground">Closed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAPA Tracking Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">CAPA Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>ID</TableHead>
                <TableHead>Non-Conformity</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const cfg = statusConfig[record.status];
                const StatusIcon = cfg.icon;
                return (
                  <TableRow key={record.id} className="border-border/30">
                    <TableCell className="font-mono text-xs text-primary">{record.id}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-sm text-foreground truncate">{record.nonConformity}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.assignedPerson}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.deadline}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={record.status}
                        onValueChange={(val) => updateStatus(record.id, val as CAPAStatus)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
