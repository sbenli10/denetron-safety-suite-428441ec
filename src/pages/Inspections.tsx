import { useState } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InspectionRow } from "@/components/InspectionRow";

const allInspections = [
  { id: "INS-0421", site: "Warehouse Alpha — Zone B", inspector: "A. Yılmaz", date: "Feb 23, 2026", status: "completed" as const, riskLevel: "low" as const, score: 96 },
  { id: "INS-0420", site: "Construction Site Gamma", inspector: "M. Demir", date: "Feb 22, 2026", status: "in-progress" as const, riskLevel: "high" as const },
  { id: "INS-0419", site: "Chemical Plant — Section 4", inspector: "E. Kaya", date: "Feb 21, 2026", status: "overdue" as const, riskLevel: "critical" as const },
  { id: "INS-0418", site: "Office Complex — Floor 3", inspector: "S. Çelik", date: "Feb 20, 2026", status: "completed" as const, riskLevel: "low" as const, score: 92 },
  { id: "INS-0417", site: "Manufacturing Unit Delta", inspector: "K. Arslan", date: "Feb 19, 2026", status: "scheduled" as const, riskLevel: "medium" as const },
  { id: "INS-0416", site: "Solar Farm — Block C", inspector: "B. Öztürk", date: "Feb 18, 2026", status: "completed" as const, riskLevel: "low" as const, score: 98 },
  { id: "INS-0415", site: "Mine Entrance — Shaft 2", inspector: "T. Korkmaz", date: "Feb 17, 2026", status: "completed" as const, riskLevel: "medium" as const, score: 78 },
  { id: "INS-0414", site: "Harbor Logistics Terminal", inspector: "A. Yılmaz", date: "Feb 16, 2026", status: "in-progress" as const, riskLevel: "high" as const },
  { id: "INS-0413", site: "Refinery Unit — East Wing", inspector: "M. Demir", date: "Feb 15, 2026", status: "overdue" as const, riskLevel: "critical" as const },
  { id: "INS-0412", site: "Data Center — Server Room B", inspector: "S. Çelik", date: "Feb 14, 2026", status: "completed" as const, riskLevel: "low" as const, score: 100 },
];

const statusFilters = ["all", "completed", "in-progress", "overdue", "scheduled"] as const;

export default function Inspections() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = allInspections.filter((i) => {
    const matchesSearch = i.site.toLowerCase().includes(search.toLowerCase()) || i.inspector.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || i.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspections</h1>
          <p className="text-sm text-muted-foreground mt-1">{allInspections.length} total inspections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2 gradient-primary border-0 text-foreground">
            <Plus className="h-4 w-4" /> New Inspection
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass-card divide-y divide-border/50">
        {filtered.length > 0 ? (
          filtered.map((inspection) => (
            <InspectionRow key={inspection.id} {...inspection} />
          ))
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No inspections found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
