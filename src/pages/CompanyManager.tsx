import { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, FileSpreadsheet, Plus, Save, 
  ChevronRight, ChevronLeft, CheckCircle2, Upload,
  Download, Trash2, Edit, Eye, Search, Filter,
  Factory, Briefcase, HardHat, AlertTriangle,
  X, Check, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseEmployeeExcel, downloadEmployeeTemplate, type ParsedEmployee } from "@/utils/excelParser";
import { NACE_DATABASE, searchNACE, type NACECode } from "@/utils/naceDatabase";
import type { Company, RiskTemplate } from "@/types/companies";
import { cn } from "@/lib/utils";

const SECTOR_TEMPLATES = [
  {
    id: "construction",
    name: "İnşaat Sektörü",
    icon: HardHat,
    description: "50+ inşaat risk maddesi",
    color: "text-orange-600 bg-orange-50 border-orange-200"
  },
  {
    id: "office",
    name: "Ofis Ortamı",
    icon: Briefcase,
    description: "50+ ofis risk maddesi",
    color: "text-blue-600 bg-blue-50 border-blue-200"
  },
  {
    id: "manufacturing",
    name: "Üretim Tesisi",
    icon: Factory,
    description: "50+ üretim risk maddesi",
    color: "text-purple-600 bg-purple-50 border-purple-200"
  }
];

export default function CompanyManager() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hazardFilter, setHazardFilter] = useState<string | null>(null); // ✅ Yeni
  
  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Temel Bilgiler
  const [formData, setFormData] = useState({
    company_name: "",
    tax_number: "",
    nace_code: "",
    hazard_class: "" as "Az Tehlikeli" | "Tehlikeli" | "Çok Tehlikeli" | "",
    industry_sector: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    employee_count: 0
  });

  // ✅ NACE Combobox State
  const [naceOpen, setNaceOpen] = useState(false);
  const [naceSearchQuery, setNaceSearchQuery] = useState("");
  const [selectedNACE, setSelectedNACE] = useState<NACECode | null>(null);

  // Step 2: Sektörel Şablon
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [riskTemplates, setRiskTemplates] = useState<RiskTemplate[]>([]);

  // Step 3: Çalışan Yükleme
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);

  // ✅ Load Companies
  useEffect(() => {
    if (user) {
      loadCompanies();
      loadRiskTemplates();
    }
  }, [user]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies((data as Company[]) || []);
    } catch (e: any) {
      toast.error(`Firmalar yüklenemedi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRiskTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("risk_templates")
        .select("*");

      if (error) throw error;
      
      const templates = (data || []).map(template => ({
        ...template,
        risk_items: JSON.parse(JSON.stringify(template.risk_items))
      })) as RiskTemplate[];
      
      setRiskTemplates(templates);
    } catch (e: any) {
      console.error("Risk templates yüklenemedi:", e);
    }
  };

  // ✅ NACE Seçimi
  const handleNACESelect = (nace: NACECode) => {
    setSelectedNACE(nace);
    setFormData(prev => ({
      ...prev,
      nace_code: nace.code,
      hazard_class: nace.hazard_class,
      industry_sector: nace.industry_sector
    }));
    setSelectedTemplate(nace.industry_sector);
    setNaceOpen(false);
    toast.success(`${nace.name} seçildi`);
  };

  // ✅ Excel Yükleme
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEmployeeFile(file);
    toast.info("📄 Excel dosyası işleniyor...");

    try {
      const employees = await parseEmployeeExcel(file);
      setParsedEmployees(employees);
      toast.success(`✅ ${employees.length} çalışan bulundu`);
    } catch (error: any) {
      toast.error(`❌ ${error.message}`);
      setEmployeeFile(null);
    }
  };

    const handleSaveCompany = async () => {
    // Validation
    if (!formData.company_name || !formData.tax_number || !formData.nace_code) {
        toast.error("Lütfen zorunlu alanları doldurun");
        return;
    }

    if (formData.tax_number.length !== 10 && formData.tax_number.length !== 11) {
        toast.error("Vergi numarası 10 veya 11 haneli olmalıdır");
        return;
    }

    setSaving(true);

    try {
        // Risk template ID'sini al
        const template = riskTemplates.find(t => t.industry_sector === selectedTemplate);
        
        // ✅ JSON-safe dönüşüm
        const employeesJson = JSON.parse(JSON.stringify(parsedEmployees));
        
        // RPC Fonksiyonunu Çağır
        const { data, error } = await supabase.rpc('create_company_with_data', {
        p_owner_id: user?.id,
        p_company_data: {
            company_name: formData.company_name,
            tax_number: formData.tax_number,
            nace_code: formData.nace_code,
            hazard_class: formData.hazard_class,
            industry_sector: formData.industry_sector,
            address: formData.address,
            city: formData.city,
            phone: formData.phone,
            email: formData.email,
            employee_count: parsedEmployees.length || formData.employee_count
        },
        p_risk_template_id: template?.id || null,
        p_employees: employeesJson
        });

        if (error) throw error;

        // ✅ Type assertion
        const result = data as {
        success: boolean;
        error?: string;
        company_id?: string;
        inserted_risks?: number;
        inserted_employees?: number;
        };

        if (!result.success) {
        throw new Error(result.error || "Bilinmeyen hata");
        }

        // Başarılı
        toast.success("🎉 Firma başarıyla kaydedildi!", {
        description: `${result.inserted_risks || 0} risk, ${result.inserted_employees || 0} çalışan eklendi`
        });

        setWizardOpen(false);
        resetWizard();
        loadCompanies();

    } catch (e: unknown) {
        const error = e as Error;
        console.error(error);
        toast.error(`❌ Kaydetme hatası: ${error.message}`);
    } finally {
        setSaving(false);
    }
    };

  // ✅ Wizard Reset
  const resetWizard = () => {
    setCurrentStep(1);
    setFormData({
      company_name: "",
      tax_number: "",
      nace_code: "",
      hazard_class: "",
      industry_sector: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      employee_count: 0
    });
    setSelectedNACE(null);
    setNaceSearchQuery("");
    setSelectedTemplate("");
    setEmployeeFile(null);
    setParsedEmployees([]);
  };

  // ✅ Wizard Navigation
  const goToStep = (step: number) => {
    if (step === 2 && currentStep === 1) {
      if (!formData.company_name || !formData.tax_number || !formData.nace_code) {
        toast.error("Lütfen zorunlu alanları doldurun");
        return;
      }
    }
    setCurrentStep(step);
  };

  // ✅ Filtered & Memoized Companies
  const filteredCompanies = useMemo(() => {
    let result = companies;

    // Hazard filter
    if (hazardFilter) {
      result = result.filter(c => c.hazard_class === hazardFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        company =>
          company.company_name.toLowerCase().includes(query) ||
          company.tax_number.includes(query) ||
          company.nace_code.includes(query)
      );
    }

    return result;
  }, [companies, hazardFilter, searchQuery]);

  // ✅ Stats with Filter
  const stats = useMemo(() => {
    return {
      total: companies.length,
      veryHazardous: companies.filter(c => c.hazard_class === "Çok Tehlikeli").length,
      hazardous: companies.filter(c => c.hazard_class === "Tehlikeli").length,
      lessHazardous: companies.filter(c => c.hazard_class === "Az Tehlikeli").length,
    };
  }, [companies]);

  // ========================
  // WIZARD STEPS
  // ========================
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Firma Ünvanı *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Örn: ABC İnşaat A.Ş."
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Vergi Numarası *</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").substring(0, 11);
                    setFormData(prev => ({ ...prev, tax_number: value }));
                  }}
                  placeholder="10 veya 11 haneli"
                  maxLength={11}
                  className="mt-2"
                />
              </div>

              {/* ✅ NACE Combobox */}
              <div className="md:col-span-2">
                <Label>NACE Kodu * (Yazarak Arayın)</Label>
                <Popover open={naceOpen} onOpenChange={setNaceOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={naceOpen}
                      className="w-full justify-between mt-2"
                    >
                      {selectedNACE ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{selectedNACE.code}</Badge>
                          {selectedNACE.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">NACE kodu veya sektör adı ile arayın...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="NACE kodu veya sektör adı..." 
                        value={naceSearchQuery}
                        onValueChange={setNaceSearchQuery}
                      />
                      <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {searchNACE(naceSearchQuery).map((nace) => (
                            <CommandItem
                              key={nace.code}
                              value={nace.code}
                              onSelect={() => handleNACESelect(nace)}
                              className="flex items-center gap-2"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedNACE?.code === nace.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {nace.code}
                                </Badge>
                                <span className="text-sm">{nace.name}</span>
                                <Badge className={cn(
                                  "ml-auto text-xs",
                                  nace.hazard_class === "Çok Tehlikeli" && "bg-red-100 text-red-700",
                                  nace.hazard_class === "Tehlikeli" && "bg-orange-100 text-orange-700",
                                  nace.hazard_class === "Az Tehlikeli" && "bg-green-100 text-green-700"
                                )}>
                                  {nace.hazard_class}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Tehlike Sınıfı</Label>
                <div className={`mt-2 p-3 rounded-lg border-2 font-semibold ${
                  formData.hazard_class === "Çok Tehlikeli" 
                    ? "bg-red-50 border-red-300 text-red-700"
                    : formData.hazard_class === "Tehlikeli"
                    ? "bg-orange-50 border-orange-300 text-orange-700"
                    : formData.hazard_class === "Az Tehlikeli"
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "bg-slate-50 border-slate-300 text-slate-500"
                }`}>
                  {formData.hazard_class || "NACE kodu seçiniz"}
                </div>
              </div>

              <div>
                <Label>Şehir</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="İstanbul"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Adres</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Tam adres"
                className="mt-2"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0555 123 4567"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@firma.com"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Zeki Özellik:</strong> Sektörünüze uygun risk şablonunu seçin. 
                Otomatik olarak 50+ risk maddesi firmaya atanacaktır.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {SECTOR_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate === template.id
                      ? `ring-2 ring-primary ${template.color}`
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${template.color}`}>
                        <template.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedTemplate === template.id && (
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-semibold">Seçildi</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {selectedTemplate && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <p className="text-sm text-success font-semibold">
                  ✅ {SECTOR_TEMPLATES.find(t => t.id === selectedTemplate)?.name} şablonu seçildi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu şablondaki tüm risk maddeleri firmaya otomatik atanacaktır
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>📋 Excel Şablonu:</strong> Çalışanlarınızı toplu olarak yüklemek için 
                önce şablon dosyasını indirin ve doldurun.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadEmployeeTemplate}
                className="mt-3 gap-2"
              >
                <Download className="h-4 w-4" />
                Excel Şablonunu İndir
              </Button>
            </div>

            <div>
              <Label>Excel/CSV Dosyası Yükle</Label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                  <span className="text-sm font-semibold text-foreground">
                    {employeeFile ? employeeFile.name : "Dosya seçin veya sürükleyin"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Excel (.xlsx, .xls) veya CSV formatı
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {parsedEmployees.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">
                    Bulunan Çalışanlar ({parsedEmployees.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEmployeeFile(null);
                      setParsedEmployees([]);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Temizle
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Soyad</TableHead>
                        <TableHead>Görev</TableHead>
                        <TableHead>Bölüm</TableHead>
                        <TableHead>Başlangıç</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedEmployees.slice(0, 5).map((emp, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </TableCell>
                          <TableCell>{emp.job_title}</TableCell>
                          <TableCell>{emp.department || "-"}</TableCell>
                          <TableCell>{emp.start_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {parsedEmployees.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{parsedEmployees.length - 5} çalışan daha...
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ========================
  // MAIN RENDER
  // ========================
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Firma Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Müşteri firmalarınızı kaydedin ve yönetin
          </p>
        </div>

        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus className="h-5 w-5" />
              Yeni Firma Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Firma Kayıt Sihirbazı</DialogTitle>
              <DialogDescription>
                3 adımda firma kaydı oluşturun
              </DialogDescription>
            </DialogHeader>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-6">
              {[
                { num: 1, label: "Temel Bilgiler" },
                { num: 2, label: "Risk Şablonu" },
                { num: 3, label: "Çalışan Yükleme" }
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => goToStep(step.num)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep === step.num
                        ? 'bg-primary border-primary text-white scale-110'
                        : currentStep > step.num
                        ? 'bg-success border-success text-white'
                        : 'bg-secondary border-border text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      step.num
                    )}
                  </button>
                  <span className={`text-sm font-medium hidden md:block ${
                    currentStep >= step.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                  {idx < 2 && (
                    <div className={`flex-1 h-1 rounded mx-2 ${
                      currentStep > step.num ? 'bg-success' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderWizardStep()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Geri
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={() => goToStep(currentStep + 1)}
                  className="gap-2"
                >
                  İleri
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSaveCompany}
                  disabled={saving}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  {saving ? (
                    <>
                      <Save className="h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Firmayı Kaydet
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ✅ Stats (Tıklanabilir) */}
      <div className="grid grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            hazardFilter === null && "ring-2 ring-primary"
          )}
          onClick={() => setHazardFilter(null)}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">Toplam Firma</p>
            {hazardFilter === null && (
              <Badge className="mt-2" variant="default">Aktif</Badge>
            )}
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg hover:border-red-500/50",
            hazardFilter === "Çok Tehlikeli" && "ring-2 ring-red-500 bg-red-50 dark:bg-red-950"
          )}
          onClick={() => setHazardFilter("Çok Tehlikeli")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.veryHazardous}
            </div>
            <p className="text-xs text-muted-foreground">Çok Tehlikeli</p>
            {hazardFilter === "Çok Tehlikeli" && (
              <Badge className="mt-2 bg-red-600">Filtrelendi</Badge>
            )}
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg hover:border-orange-500/50",
            hazardFilter === "Tehlikeli" && "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950"
          )}
          onClick={() => setHazardFilter("Tehlikeli")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {stats.hazardous}
            </div>
            <p className="text-xs text-muted-foreground">Tehlikeli</p>
            {hazardFilter === "Tehlikeli" && (
              <Badge className="mt-2 bg-orange-600">Filtrelendi</Badge>
            )}
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50",
            hazardFilter === "Az Tehlikeli" && "ring-2 ring-green-500 bg-green-50 dark:bg-green-950"
          )}
          onClick={() => setHazardFilter("Az Tehlikeli")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats.lessHazardous}
            </div>
            <p className="text-xs text-muted-foreground">Az Tehlikeli</p>
            {hazardFilter === "Az Tehlikeli" && (
              <Badge className="mt-2 bg-green-600">Filtrelendi</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ Search & Filter Clear */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Firma adı, vergi no veya NACE kodu ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {hazardFilter && (
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setHazardFilter(null)}
          >
            <X className="h-4 w-4" />
            Filtreyi Kaldır
          </Button>
        )}
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Firmalar ({filteredCompanies.length})</CardTitle>
          <CardDescription>
            {hazardFilter 
              ? `${hazardFilter} sınıfındaki firmalar` 
              : "Kayıtlı firmalarınızın listesi"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hazardFilter 
                  ? `${hazardFilter} sınıfında firma bulunamadı` 
                  : "Henüz firma eklenmemiş"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma Ünvanı</TableHead>
                  <TableHead>Vergi No</TableHead>
                  <TableHead>NACE</TableHead>
                  <TableHead>Tehlike Sınıfı</TableHead>
                  <TableHead>Çalışan</TableHead>
                  <TableHead>Şehir</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-semibold">
                      {company.company_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {company.tax_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.nace_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        company.hazard_class === "Çok Tehlikeli"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : company.hazard_class === "Tehlikeli"
                          ? "bg-orange-100 text-orange-700 border-orange-300"
                          : "bg-green-100 text-green-700 border-green-300"
                      }>
                        {company.hazard_class}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company.employee_count}
                      </div>
                    </TableCell>
                    <TableCell>{company.city || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}