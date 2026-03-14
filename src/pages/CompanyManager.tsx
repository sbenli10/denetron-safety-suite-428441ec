import { useState, useEffect, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { 
  Building2, Users, FileSpreadsheet, Plus, Save, 
  ChevronRight, ChevronLeft, CheckCircle2, Upload,
  Download, Trash2, Edit, Eye, Search, Filter,
  Factory, Briefcase, HardHat, AlertTriangle,
  X, Check, ChevronsUpDown,
  Mail,
  Phone,
  MapPin,
  ImagePlus,
  Warehouse,
  GraduationCap,
  ShoppingCart,
  UtensilsCrossed,
  Truck,
  HeartPulse
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
import type { Company, Employee, RiskTemplate } from "@/types/companies";
import { cn } from "@/lib/utils";

interface NACEVirtualListProps {
  items: NACECode[];
  selectedCode: string | undefined;
  onSelect: (nace: NACECode) => void;
}

const NACEVirtualList: React.FC<NACEVirtualListProps> = ({ 
  items, 
  selectedCode, 
  onSelect 
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sonuç bulunamadı</p>
      </div>
    );
  }

  return (
    <List
      height={450}
      itemCount={items.length}
      itemSize={100}
      width="100%"
      overscanCount={5}
      style={{
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch"
      }}
    >
      {({ index, style }) => {
        const nace = items[index];
        const isSelected = selectedCode === nace.code;

        return (
          <div
            style={style}
            onClick={() => onSelect(nace)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors border-b",
              isSelected && "bg-primary/10"
            )}
          >
            <Check
              className={cn(
                "h-5 w-5 mt-0.5 shrink-0",
                isSelected ? "opacity-100 text-primary" : "opacity-0"
              )}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-mono text-xs">
                  {nace.code}
                </Badge>
                <Badge
                  className={cn(
                    "text-xs",
                    nace.hazard_class === "Çok Tehlikeli" &&
                      "bg-red-100 text-red-700 border-red-300",
                    nace.hazard_class === "Tehlikeli" &&
                      "bg-orange-100 text-orange-700 border-orange-300",
                    nace.hazard_class === "Az Tehlikeli" &&
                      "bg-green-100 text-green-700 border-green-300"
                  )}
                >
                  {nace.hazard_class}
                </Badge>
              </div>
              <p className="text-sm font-medium leading-tight">{nace.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {nace.industry_sector}
              </p>
            </div>
          </div>
        );
      }}
    </List>
  );
};

const SECTOR_TEMPLATES = [
  {
    id: "construction",
    name: "İnşaat Sektörü",
    industrySector: "İnşaat Sektörü",
    aliases: ["İnşaat", "Şantiye", "Yapı", "Altyapı"],
    icon: HardHat,
    description: "50+ inşaat risk maddesi",
    color: "text-orange-600 bg-orange-50 border-orange-200"
  },
  {
    id: "office",
    name: "Ofis Ortamı",
    industrySector: "Ofis Ortamı",
    aliases: ["Ofis", "Büro", "İdari Birim", "Çağrı Merkezi"],
    icon: Briefcase,
    description: "50+ ofis risk maddesi",
    color: "text-blue-600 bg-blue-50 border-blue-200"
  },
  {
    id: "manufacturing",
    name: "Üretim Tesisi",
    industrySector: "Üretim Tesisi",
    aliases: ["Üretim", "İmalat", "Fabrika", "Atölye"],
    icon: Factory,
    description: "50+ üretim risk maddesi",
    color: "text-purple-600 bg-purple-50 border-purple-200"
  },
  {
    id: "warehouse",
    name: "Depo ve Lojistik",
    industrySector: "Depo ve Lojistik",
    aliases: ["Depo", "Lojistik", "Sevkiyat", "Stok Alanı"],
    icon: Warehouse,
    description: "50+ depolama ve sevkiyat risk maddesi",
    color: "text-amber-700 bg-amber-50 border-amber-200"
  },
  {
    id: "healthcare",
    name: "Sağlık Kuruluşu",
    industrySector: "Sağlık Kuruluşu",
    aliases: ["Sağlık", "Hastane", "Klinik", "Poliklinik", "Laboratuvar"],
    icon: HeartPulse,
    description: "50+ sağlık hizmeti ve biyolojik risk maddesi",
    color: "text-rose-700 bg-rose-50 border-rose-200"
  },
  {
    id: "education",
    name: "Eğitim Kurumu",
    industrySector: "Eğitim Kurumu",
    aliases: ["Okul", "Eğitim", "Kurs", "Üniversite", "Yurt"],
    icon: GraduationCap,
    description: "50+ eğitim ortamı ve kampüs risk maddesi",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200"
  },
  {
    id: "retail",
    name: "Mağaza ve Perakende",
    industrySector: "Mağaza ve Perakende",
    aliases: ["Mağaza", "Perakende", "Market", "AVM", "Satış Alanı"],
    icon: ShoppingCart,
    description: "50+ müşteri alanı ve perakende risk maddesi",
    color: "text-cyan-700 bg-cyan-50 border-cyan-200"
  },
  {
    id: "food",
    name: "Yeme İçme ve Mutfak",
    industrySector: "Yeme İçme ve Mutfak",
    aliases: ["Restoran", "Kafe", "Mutfak", "Gıda", "Yemekhane"],
    icon: UtensilsCrossed,
    description: "50+ mutfak, hijyen ve sıcak yüzey risk maddesi",
    color: "text-red-700 bg-red-50 border-red-200"
  },
  {
    id: "transport",
    name: "Taşımacılık ve Saha Operasyonu",
    industrySector: "Taşımacılık ve Saha Operasyonu",
    aliases: ["Taşımacılık", "Nakliye", "Servis", "Araç Filosu", "Saha Operasyonu"],
    icon: Truck,
    description: "50+ sürüş, yükleme ve saha operasyonu risk maddesi",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200"
  }
];

function normalizeTemplateText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function resolveSectorTemplateValue(industrySector?: string | null) {
  const normalizedSource = normalizeTemplateText(industrySector || "");
  if (!normalizedSource) return "";

  const matchedTemplate = SECTOR_TEMPLATES.find((template) => {
    const candidates = [template.industrySector, template.name, ...(template.aliases || [])];
    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeTemplateText(candidate);
      return (
        normalizedSource === normalizedCandidate ||
        normalizedSource.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedSource)
      );
    });
  });

  return matchedTemplate?.industrySector || industrySector || "";
}

export default function CompanyManager() {
  const { user } = useAuth();
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hazardFilter, setHazardFilter] = useState<string | null>(null);
  
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
    logo_url: "",
    employee_count: 0
  });
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // NACE Combobox State
  const [naceOpen, setNaceOpen] = useState(false);
  const [naceSearchQuery, setNaceSearchQuery] = useState("");
  const [selectedNACE, setSelectedNACE] = useState<NACECode | null>(null);

  // Step 2: Sektörel Şablon
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [riskTemplates, setRiskTemplates] = useState<RiskTemplate[]>([]);

  // Step 3: Çalışan Yükleme
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [loadingExistingEmployees, setLoadingExistingEmployees] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("all");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeDraft, setEmployeeDraft] = useState<Partial<Employee>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    if (user) {
      loadCompanies();
      loadRiskTemplates();
    }
  }, [user]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        owner_id: item.user_id,
        company_name: item.name,
        nace_code: item.industry || "",
        hazard_class: item.hazard_class || "Az Tehlikeli",
        logo_url: item.logo_url || "",
      }));

      setCompanies(mappedData as Company[]);
      
    } catch (e: any) {
      console.error("❌ Veri çekme hatası:", e.message);
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

  const loadExistingEmployees = async (companyId: string) => {
    try {
      setLoadingExistingEmployees(true);
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      if (error) throw error;
      setExistingEmployees((data || []) as Employee[]);
    } catch (error: any) {
      console.error("Çalışanlar yüklenemedi:", error);
      toast.error(`Firma çalışanları yüklenemedi: ${error.message}`);
      setExistingEmployees([]);
    } finally {
      setLoadingExistingEmployees(false);
    }
  };

  const employeeDepartments = useMemo(() => {
    return Array.from(
      new Set(
        existingEmployees
          .map((employee) => (employee.department || "").trim())
          .filter((department) => department.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, "tr"));
  }, [existingEmployees]);

  const filteredExistingEmployees = useMemo(() => {
    const normalizedSearch = employeeSearchQuery.trim().toLocaleLowerCase("tr-TR");

    return existingEmployees.filter((employee) => {
      const matchesDepartment =
        employeeDepartmentFilter === "all" ||
        (employee.department || "").trim() === employeeDepartmentFilter;

      if (!matchesDepartment) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        employee.first_name,
        employee.last_name,
        employee.job_title,
        employee.department,
        employee.phone,
        employee.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(normalizedSearch);
    });
  }, [employeeDepartmentFilter, employeeSearchQuery, existingEmployees]);

  const startEmployeeEdit = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeDraft({
      first_name: employee.first_name,
      last_name: employee.last_name,
      job_title: employee.job_title,
      department: employee.department || "",
      phone: employee.phone || "",
      email: employee.email || "",
    });
  };

  const cancelEmployeeEdit = () => {
    setEditingEmployeeId(null);
    setEmployeeDraft({});
  };

  const updateEmployeeDraft = (patch: Partial<Employee>) => {
    setEmployeeDraft((prev) => ({ ...prev, ...patch }));
  };

  const saveEmployeeEdit = async (employeeId: string) => {
    setSavingEmployeeId(employeeId);
    try {
      const payload = {
        first_name: (employeeDraft.first_name || "").trim(),
        last_name: (employeeDraft.last_name || "").trim(),
        job_title: (employeeDraft.job_title || "").trim(),
        department: (employeeDraft.department || "").trim() || null,
        phone: (employeeDraft.phone || "").trim() || null,
        email: (employeeDraft.email || "").trim() || null,
      };

      if (!payload.first_name || !payload.last_name || !payload.job_title) {
        toast.error("Ad, soyad ve görev alanları zorunludur.");
        return;
      }

      const { error } = await supabase.from("employees").update(payload).eq("id", employeeId);
      if (error) throw error;

      setExistingEmployees((prev) =>
        prev.map((employee) => (employee.id === employeeId ? { ...employee, ...payload, department: payload.department || undefined, phone: payload.phone || undefined, email: payload.email || undefined } : employee))
      );

      toast.success("Çalışan bilgileri güncellendi.");
      cancelEmployeeEdit();
    } catch (error: any) {
      toast.error(`Çalışan güncellenemedi: ${error.message}`);
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const deleteExistingEmployee = async (employee: Employee) => {
    const confirmed = confirm(`${employee.first_name} ${employee.last_name} çalışanını firmadan kaldırmak istediğinize emin misiniz?`);
    if (!confirmed) return;

    setDeletingEmployeeId(employee.id);
    try {
      const { error } = await supabase.from("employees").update({ is_active: false }).eq("id", employee.id);
      if (error) throw error;

      setExistingEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      toast.success("Çalışan pasif hale getirildi.");
      if (editingEmployeeId === employee.id) {
        cancelEmployeeEdit();
      }
    } catch (error: any) {
      toast.error(`Çalışan silinemedi: ${error.message}`);
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const syncCompanyLogoPreview = async (logoValue?: string | null) => {
    const nextValue = (logoValue || "").trim();
    if (!nextValue) {
      setLogoPreviewUrl("");
      return;
    }

    if (/^https?:\/\//i.test(nextValue) || nextValue.startsWith("data:")) {
      setLogoPreviewUrl(nextValue);
      return;
    }

    const { data, error } = await supabase.storage.from("company-logos").createSignedUrl(nextValue, 3600);
    if (error) {
      setLogoPreviewUrl("");
      return;
    }

    setLogoPreviewUrl(data?.signedUrl || "");
  };

  const handleCompanyLogoUpload = async (file: File) => {
    if (!user?.id) {
      toast.error("Logo yüklemek için kullanıcı bilgisi bulunamadı");
      return;
    }

    setUploadingLogo(true);
    const localPreview = URL.createObjectURL(file);
    setLogoPreviewUrl(localPreview);

    try {
      const fileExtension = file.name.split(".").pop() || "png";
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

      const { error } = await supabase.storage.from("company-logos").upload(fileName, file, {
        upsert: true,
        cacheControl: "3600",
      });

      if (error) throw error;

      setFormData((prev) => ({ ...prev, logo_url: fileName }));
      await syncCompanyLogoPreview(fileName);
      toast.success("Firma logosu yüklendi");
    } catch (error: any) {
      setLogoPreviewUrl("");
      toast.error(`Firma logosu yüklenemedi: ${error.message}`);
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploadingLogo(false);
    }
  };

  const clearCompanyLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: "" }));
    setLogoPreviewUrl("");
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleViewCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      if (company.logo_url && !/^https?:\/\//i.test(company.logo_url) && !company.logo_url.startsWith("data:")) {
        const { data } = await supabase.storage.from("company-logos").createSignedUrl(company.logo_url, 3600);
        setViewingCompany({ ...company, logo_url: data?.signedUrl || company.logo_url });
        return;
      }
      setViewingCompany(company);
    }
  };

  const handleEditCompany = (company: Company) => {
    setFormData({
      company_name: company.company_name,
      tax_number: company.tax_number,
      nace_code: company.nace_code,
      hazard_class: company.hazard_class,
      industry_sector: company.industry_sector || "",
      address: company.address || "",
      city: company.city || "",
      phone: company.phone || "",
      email: company.email || "",
      logo_url: company.logo_url || "",
      employee_count: company.employee_count || 0,
    });

    void syncCompanyLogoPreview(company.logo_url || "");

    const nace = NACE_DATABASE.find(n => n.code === company.nace_code);
    if (nace) {
      setSelectedNACE(nace);
    }

    if (company.industry_sector) {
      setSelectedTemplate(resolveSectorTemplateValue(company.industry_sector));
    }

    setEditingCompanyId(company.id);
    setWizardOpen(true);
    setCurrentStep(1);
    void loadExistingEmployees(company.id);
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`"${companyName}" firmasını silmek istediğinize emin misiniz?\n\n⚠️ Bu işlem geri alınamaz ve tüm ilişkili veriler (çalışanlar, risk değerlendirmeleri) silinecektir!`)) {
      return;
    }

    try {
      const existingCompany = companies.find((company) => company.id === companyId);
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

      if (error) throw error;

      if (existingCompany?.logo_url && !/^https?:\/\//i.test(existingCompany.logo_url) && !existingCompany.logo_url.startsWith("data:")) {
        await supabase.storage.from("company-logos").remove([existingCompany.logo_url]);
      }

      toast.success(`✅ "${companyName}" firması silindi`);
      loadCompanies();
    } catch (error: any) {
      console.error("Delete company error:", error);
      toast.error(`❌ Firma silinemedi: ${error.message}`);
    }
  };

  const handleNACESelect = (nace: NACECode) => {
    const resolvedTemplateValue = resolveSectorTemplateValue(nace.industry_sector);
    setSelectedNACE(nace);
    setFormData(prev => ({
      ...prev,
      nace_code: nace.code,
      hazard_class: nace.hazard_class,
      industry_sector: nace.industry_sector
    }));
    setSelectedTemplate(resolvedTemplateValue);
    setNaceOpen(false);
    setNaceSearchQuery(""); // Reset search
    toast.success(`${nace.name} seçildi`);
  };

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
      const template = riskTemplates.find((t) => {
        const templateSector = resolveSectorTemplateValue(t.industry_sector);
        return templateSector === selectedTemplate || t.industry_sector === selectedTemplate;
      });

      const employeesJson = parsedEmployees.map((emp) => ({
        first_name: emp.first_name || "",
        last_name: emp.last_name || "",
        tc_number: emp.tc_number || null,
        job_title: emp.job_title || "Belirtilmemiş",
        department: emp.department || null,
        start_date: emp.start_date || new Date().toISOString().split("T")[0],
        employment_type: emp.employment_type || "Süresiz",
        birth_date: emp.birth_date || null,
        gender: emp.gender || null,
        email: emp.email || null,
        phone: emp.phone || null,
      }));

      if (editingCompanyId) {
        const existingCompany = companies.find((company) => company.id === editingCompanyId);
        const { error: companyError } = await (supabase as any)
          .from("companies")
          .update({
            name: formData.company_name,
            tax_number: formData.tax_number,
            industry: formData.nace_code,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            logo_url: formData.logo_url || null,
            employee_count: employeesJson.length || formData.employee_count,
          })
          .eq("id", editingCompanyId);

        if (companyError) throw companyError;

        if (
          existingCompany?.logo_url &&
          existingCompany.logo_url !== formData.logo_url &&
          !/^https?:\/\//i.test(existingCompany.logo_url) &&
          !existingCompany.logo_url.startsWith("data:")
        ) {
          await supabase.storage.from("company-logos").remove([existingCompany.logo_url]);
        }

        if (employeesJson.length > 0) {
          const employeesToInsert = employeesJson.map(emp => ({
            ...emp,
            company_id: editingCompanyId,
            is_active: true,
          }));

          const { error: employeesError } = await supabase
            .from("employees")
            .insert(employeesToInsert);

          if (employeesError) throw employeesError;
        }

        toast.success("✅ Firma güncellendi!", {
          description: employeesJson.length > 0 
            ? `${employeesJson.length} çalışan eklendi`
            : "Firma bilgileri güncellendi"
        });

        setWizardOpen(false);
        setEditingCompanyId(null);
        resetWizard();
        loadCompanies();
        return;
      }

      const { data, error } = await supabase.rpc("create_company_with_data", {
        p_owner_id: user?.id,
        p_company_data: {
          company_name: formData.company_name,
          tax_number: formData.tax_number,
          nace_code: formData.nace_code,
          hazard_class: formData.hazard_class,
          industry_sector: formData.industry_sector,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          employee_count: employeesJson.length || formData.employee_count,
        },
        p_risk_template_id: template?.id || null,
        p_employees: employeesJson,
      });

      if (error) throw error;

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

      if (result.company_id && formData.logo_url) {
        const { error: logoUpdateError } = await (supabase as any)
          .from("companies")
          .update({ logo_url: formData.logo_url })
          .eq("id", result.company_id);

        if (logoUpdateError) throw logoUpdateError;
      }

      toast.success("🎉 Firma başarıyla kaydedildi!", {
        description: `${result.inserted_risks || 0} risk, ${result.inserted_employees || 0} çalışan eklendi`,
      });

      setWizardOpen(false);
      resetWizard();
      loadCompanies();
    } catch (e: unknown) {
      const error = e as Error;
      console.error("❌ Kaydetme Hatası:", error);
      toast.error(`❌ Kaydetme hatası: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

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
      logo_url: "",
      employee_count: 0
    });
    setLogoPreviewUrl("");
    setSelectedNACE(null);
    setNaceSearchQuery("");
    setSelectedTemplate("");
    setEmployeeFile(null);
    setParsedEmployees([]);
    setExistingEmployees([]);
    setEmployeeSearchQuery("");
    setEmployeeDepartmentFilter("all");
    setEditingEmployeeId(null);
    setEmployeeDraft({});
    setEditingCompanyId(null);
  };

  const goToStep = (step: number) => {
    if (step === 2 && currentStep === 1) {
      if (!formData.company_name || !formData.tax_number || !formData.nace_code) {
        toast.error("Lütfen zorunlu alanları doldurun");
        return;
      }
    }
    setCurrentStep(step);
  };

  // ============================================
  // FILTERED COMPANIES
  // ============================================

  const filteredCompanies = useMemo(() => {
    let result = companies;

    if (hazardFilter) {
      result = result.filter(c => c.hazard_class === hazardFilter);
    }

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

  const stats = useMemo(() => {
    return {
      total: companies.length,
      veryHazardous: companies.filter(c => c.hazard_class === "Çok Tehlikeli").length,
      hazardous: companies.filter(c => c.hazard_class === "Tehlikeli").length,
      lessHazardous: companies.filter(c => c.hazard_class === "Az Tehlikeli").length,
    };
  }, [companies]);

  // ============================================
  // WIZARD STEPS
  // ============================================

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

              {/* ✅ NACE Combobox - 3178 KOD İÇİN OPTİMİZE EDİLMİŞ */}
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
                            <span className="truncate max-w-[140px] md:max-w-[400px]">
                              {selectedNACE.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            NACE kodu veya sektör adı ile arayın...
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="w-[95vw] md:w-[750px] max-w-[750px] p-0"
                        align="center"
                      >
                      <Command shouldFilter={false}>
                        <div className="border-b p-3 md:p-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="NACE kodu veya sektör adı yazın (en az 2 karakter)..."
                              value={naceSearchQuery}
                              onChange={(e) => setNaceSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>
                              {naceSearchQuery.length >= 2
                                ? `${searchNACE(naceSearchQuery).length} sonuç`
                                : `${NACE_DATABASE.length} toplam kod`}
                            </span>
                            {naceSearchQuery && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setNaceSearchQuery("")}
                                className="h-6 text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Temizle
                              </Button>
                            )}
                          </div>
                        </div>

                        {naceSearchQuery.length > 0 && naceSearchQuery.length < 2 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            En az 2 karakter girin
                          </div>
                        ) : (
                          <NACEVirtualList
                            items={naceSearchQuery.length >= 2 ? searchNACE(naceSearchQuery) : NACE_DATABASE}
                            selectedCode={selectedNACE?.code}
                            onSelect={handleNACESelect}
                          />
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* ✅ Seçili NACE Önizleme */}
                  {selectedNACE && (
                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Seçili NACE:</p>
                          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                            <Badge variant="outline" className="font-mono">
                              {selectedNACE.code}
                            </Badge>
                            <Badge
                              className={cn(
                                "text-xs",
                                selectedNACE.hazard_class === "Çok Tehlikeli" &&
                                  "bg-red-100 text-red-700",
                                selectedNACE.hazard_class === "Tehlikeli" &&
                                  "bg-orange-100 text-orange-700",
                                selectedNACE.hazard_class === "Az Tehlikeli" &&
                                  "bg-green-100 text-green-700"
                              )}
                            >
                              {selectedNACE.hazard_class}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{selectedNACE.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedNACE.industry_sector}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNACE(null);
                            setFormData(prev => ({
                              ...prev,
                              nace_code: "",
                              hazard_class: "",
                              industry_sector: ""
                            }));
                            setSelectedTemplate("");
                            setNaceSearchQuery("");
                          }}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ✅ Bilgi Notu */}
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 İpucu: En az 2 karakter girerek arama yapabilirsiniz. 
                    Boş bırakırsanız tüm {NACE_DATABASE.length.toLocaleString()} kod gösterilir.
                  </p>
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

              <div className="md:col-span-2">
                <Label>Firma Logosu</Label>
                <div className="mt-2 rounded-2xl border border-dashed border-border bg-secondary/20 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border bg-background">
                        {logoPreviewUrl ? (
                          <img src={logoPreviewUrl} alt="Firma logosu önizleme" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 px-3 text-center text-xs text-muted-foreground">
                            <ImagePlus className="h-5 w-5" />
                            Logo önizleme
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Kurumsal logo yükleyin</p>
                        <p className="text-xs text-muted-foreground">
                          Yüklediğiniz logo sertifika, atama yazıları ve diğer belge modüllerinde otomatik kullanılabilir.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && void handleCompanyLogoUpload(e.target.files[0])}
                        />
                        <Button type="button" variant="outline" className="gap-2" asChild>
                          <span>
                            {uploadingLogo ? <Upload className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
                            {formData.logo_url ? "Logoyu Güncelle" : "Logo Yükle"}
                          </span>
                        </Button>
                      </label>

                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={clearCompanyLogo}
                        disabled={!formData.logo_url}
                      >
                        <Trash2 className="h-4 w-4" />
                        Logoyu Sil
                      </Button>
                    </div>
                  </div>
                </div>
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SECTOR_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate === template.industrySector
                      ? `ring-2 ring-primary ${template.color}`
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.industrySector)}
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
                  {selectedTemplate === template.industrySector && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-semibold">Seçildi</span>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Örnek alanlar: {template.aliases.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {selectedTemplate && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <p className="text-sm text-success font-semibold">
                  ✅ {SECTOR_TEMPLATES.find(t => t.industrySector === selectedTemplate)?.name || selectedTemplate} şablonu seçildi
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
            {editingCompanyId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Mevcut Firma Çalışanları
                    </p>
                    <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                      Firma düzenleme ekranındasınız. Sistemde kayıtlı çalışanları aşağıda görebilir, üzerine yeni çalışan yüklemesi yapabilirsiniz.
                    </p>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {existingEmployees.length} kayıtlı çalışan
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      placeholder="Ad, görev, bölüm, telefon veya e-posta ile ara"
                      className="pl-10"
                    />
                  </div>

                  <select
                    value={employeeDepartmentFilter}
                    onChange={(e) => setEmployeeDepartmentFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Tüm departmanlar</option>
                    {employeeDepartments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 rounded-xl border bg-background">
                  {loadingExistingEmployees ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Firma çalışanları yükleniyor...
                    </div>
                  ) : existingEmployees.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Bu firmaya ait kayıtlı çalışan bulunamadı.
                    </div>
                  ) : filteredExistingEmployees.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Arama ve filtreye uygun çalışan bulunamadı.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ad Soyad</TableHead>
                            <TableHead>Görev</TableHead>
                            <TableHead>Bölüm</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExistingEmployees.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">
                                {editingEmployeeId === employee.id ? (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    <Input
                                      value={employeeDraft.first_name || ""}
                                      onChange={(e) => updateEmployeeDraft({ first_name: e.target.value })}
                                      placeholder="Ad"
                                    />
                                    <Input
                                      value={employeeDraft.last_name || ""}
                                      onChange={(e) => updateEmployeeDraft({ last_name: e.target.value })}
                                      placeholder="Soyad"
                                    />
                                  </div>
                                ) : (
                                  `${employee.first_name} ${employee.last_name}`
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEmployeeId === employee.id ? (
                                  <Input
                                    value={employeeDraft.job_title || ""}
                                    onChange={(e) => updateEmployeeDraft({ job_title: e.target.value })}
                                    placeholder="Görev"
                                  />
                                ) : (
                                  employee.job_title || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEmployeeId === employee.id ? (
                                  <Input
                                    value={employeeDraft.department || ""}
                                    onChange={(e) => updateEmployeeDraft({ department: e.target.value })}
                                    placeholder="Bölüm"
                                  />
                                ) : (
                                  employee.department || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEmployeeId === employee.id ? (
                                  <Input
                                    value={employeeDraft.phone || ""}
                                    onChange={(e) => updateEmployeeDraft({ phone: e.target.value })}
                                    placeholder="Telefon"
                                  />
                                ) : (
                                  employee.phone || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEmployeeId === employee.id ? (
                                  <Input
                                    value={employeeDraft.email || ""}
                                    onChange={(e) => updateEmployeeDraft({ email: e.target.value })}
                                    placeholder="E-posta"
                                  />
                                ) : (
                                  employee.email || "-"
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {editingEmployeeId === employee.id ? (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => saveEmployeeEdit(employee.id)}
                                        disabled={savingEmployeeId === employee.id}
                                      >
                                        {savingEmployeeId === employee.id ? "Kaydediliyor..." : "Kaydet"}
                                      </Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={cancelEmployeeEdit}>
                                        Vazgeç
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button type="button" size="sm" variant="outline" onClick={() => startEmployeeEdit(employee)}>
                                        Düzenle
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                        onClick={() => void deleteExistingEmployee(employee)}
                                        disabled={deletingEmployeeId === employee.id}
                                      >
                                        {deletingEmployeeId === employee.id ? "Siliniyor..." : "Sil"}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}

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

  // ============================================
  // MAIN RENDER
  // ============================================

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
              <DialogTitle>
                {editingCompanyId ? "Firma Düzenle" : "Yeni Firma Kayıt Sihirbazı"}
              </DialogTitle>
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

      {/* Stats */}
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

      {/* Search & Filter */}
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
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleViewCompany(company.id)}
                          className="hover:bg-blue-500/10 hover:text-blue-500"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleEditCompany(company)}
                          className="hover:bg-yellow-500/10 hover:text-yellow-500"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleDeleteCompany(company.id, company.company_name)}
                          className="text-destructive hover:bg-red-500/10"
                          title="Sil"
                        >
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

      {/* View Modal */}
      {viewingCompany && (
        <Dialog open={!!viewingCompany} onOpenChange={() => setViewingCompany(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {viewingCompany.company_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {viewingCompany.logo_url && (
                <div className="flex justify-center rounded-2xl border bg-secondary/20 p-4">
                  <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-xl border bg-background">
                    <img src={viewingCompany.logo_url} alt="Firma logosu" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Vergi No</Label>
                  <p className="font-mono font-semibold mt-1">{viewingCompany.tax_number}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">NACE</Label>
                  <Badge variant="outline" className="mt-1">{viewingCompany.nace_code}</Badge>
                </div>

                <div>
                  <Label className="text-muted-foreground">Tehlike Sınıfı</Label>
                  <Badge className={cn(
                    "mt-1",
                    viewingCompany.hazard_class === "Çok Tehlikeli" && "bg-red-100 text-red-700",
                    viewingCompany.hazard_class === "Tehlikeli" && "bg-orange-100 text-orange-700",
                    viewingCompany.hazard_class === "Az Tehlikeli" && "bg-green-100 text-green-700"
                  )}>
                    {viewingCompany.hazard_class}
                  </Badge>
                </div>

                <div>
                  <Label className="text-muted-foreground">Çalışan Sayısı</Label>
                  <p className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{viewingCompany.employee_count}</span>
                  </p>
                </div>
              </div>

              {(viewingCompany.address || viewingCompany.phone || viewingCompany.email) && (
                <div className="pt-4 border-t space-y-3">
                  <Label className="text-muted-foreground">İletişim Bilgileri</Label>
                  
                  {viewingCompany.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary mt-0.5" />
                      <span>{viewingCompany.address}</span>
                    </div>
                  )}

                  {viewingCompany.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="font-mono">{viewingCompany.phone}</span>
                    </div>
                  )}

                  {viewingCompany.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>{viewingCompany.email}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => {
                  const rawCompany = companies.find((company) => company.id === viewingCompany.id) || viewingCompany;
                  setViewingCompany(null);
                  handleEditCompany(rawCompany);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
                <Button variant="outline" onClick={() => setViewingCompany(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>    
  );
}
