import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat, Building2, Factory, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  {
    id: "construction",
    label: "Construction",
    icon: HardHat,
    hazards: [
      { name: "Fall from height", prevention: "Install guardrails, use harnesses, conduct daily scaffold inspections." },
      { name: "Struck by falling objects", prevention: "Wear hard hats, secure tools at height, establish exclusion zones." },
      { name: "Trench collapse", prevention: "Shore or slope excavations, inspect daily, keep heavy loads away from edges." },
      { name: "Electrical contact", prevention: "Locate underground cables before digging, use insulated tools, lock-out/tag-out." },
    ],
  },
  {
    id: "office",
    label: "Office",
    icon: Building2,
    hazards: [
      { name: "Ergonomic strain", prevention: "Provide adjustable chairs, enforce screen-break policy, assess workstations." },
      { name: "Slip / trip / fall", prevention: "Keep walkways clear, fix loose cables, use anti-slip mats in wet areas." },
      { name: "Fire hazard", prevention: "Maintain extinguishers, test alarms monthly, post evacuation maps." },
      { name: "Poor indoor air quality", prevention: "Service HVAC regularly, monitor CO₂ levels, ensure adequate ventilation." },
    ],
  },
  {
    id: "factory",
    label: "Factory",
    icon: Factory,
    hazards: [
      { name: "Machine entanglement", prevention: "Install guards on moving parts, enforce lock-out/tag-out, train operators." },
      { name: "Chemical exposure", prevention: "Provide SDS access, use fume hoods, mandate PPE (gloves, goggles, respirators)." },
      { name: "Noise-induced hearing loss", prevention: "Issue ear protection, rotate workers, install noise barriers." },
      { name: "Forklift collision", prevention: "Separate pedestrian/vehicle routes, use spotters, enforce speed limits." },
    ],
  },
];

export default function SafetyLibrary() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const category = categories.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Safety Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse hazards by category and start inspections</p>
      </div>

      {!category ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="glass-card p-8 flex flex-col items-center gap-4 hover:border-primary/40 transition-colors group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary group-hover:scale-110 transition-transform">
                <cat.icon className="h-7 w-7 text-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">{cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.hazards.length} hazards</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> All Categories
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.hazards.map((h) => (
              <div key={h.name} className="glass-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{h.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{h.prevention}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/inspections")}
                >
                  Start Inspection <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
