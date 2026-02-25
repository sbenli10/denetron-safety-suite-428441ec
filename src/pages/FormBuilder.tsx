import { useState } from "react";
import { Plus, GripVertical, Trash2, Type, Hash, CheckSquare, List, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldType = "text" | "number" | "checkbox" | "select" | "date" | "textarea";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
}

const fieldTypes: { type: FieldType; icon: typeof Type; label: string }[] = [
  { type: "text", icon: Type, label: "Text" },
  { type: "number", icon: Hash, label: "Number" },
  { type: "checkbox", icon: CheckSquare, label: "Checkbox" },
  { type: "select", icon: List, label: "Select" },
  { type: "date", icon: Calendar, label: "Date" },
  { type: "textarea", icon: FileText, label: "Text Area" },
];

const defaultFields: FormField[] = [
  { id: "1", type: "text", label: "Site Name", required: true },
  { id: "2", type: "date", label: "Inspection Date", required: true },
  { id: "3", type: "text", label: "Inspector Name", required: true },
  { id: "4", type: "select", label: "Risk Level", required: true },
  { id: "5", type: "textarea", label: "Observations", required: false },
  { id: "6", type: "checkbox", label: "PPE Compliant", required: false },
];

export default function FormBuilder() {
  const [fields, setFields] = useState<FormField[]>(defaultFields);
  const [formTitle, setFormTitle] = useState("Site Safety Inspection");

  const addField = (type: FieldType) => {
    setFields([...fields, {
      id: String(Date.now()),
      type,
      label: `New ${type} field`,
      required: false,
    }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, label } : f));
  };

  const getIcon = (type: FieldType) => {
    const found = fieldTypes.find(f => f.type === type);
    return found ? found.icon : Type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design custom inspection templates</p>
        </div>
        <Button size="sm" className="gap-2 gradient-primary border-0 text-foreground">
          Save Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Field Types Panel */}
        <div className="glass-card p-4 space-y-3 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Fields</h3>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card p-5">
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-lg font-bold bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 text-foreground"
            />
          </div>

          <div className="space-y-2">
            {fields.map((field) => {
              const Icon = getIcon(field.type);
              return (
                <div key={field.id} className="glass-card p-4 flex items-center gap-3 group hover:border-primary/30 transition-colors">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Input
                    value={field.label}
                    onChange={(e) => updateLabel(field.id, e.target.value)}
                    className="flex-1 bg-transparent border-0 text-sm text-foreground focus-visible:ring-0 px-0"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 shrink-0">{field.type}</span>
                  {field.required && (
                    <span className="text-[10px] text-primary font-medium shrink-0">Required</span>
                  )}
                  <button
                    onClick={() => removeField(field.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => addField("text")}
            className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Field
          </button>
        </div>
      </div>
    </div>
  );
}
