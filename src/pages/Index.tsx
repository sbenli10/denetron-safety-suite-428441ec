import {
  ArrowRight,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PreviewCard = {
  label: string;
  value: string;
  meta: string;
  tone: string;
};

type ModuleNode = {
  title: string;
  subtitle: string;
  icon: typeof Bot;
  className: string;
  glow: string;
  description: string;
  tags: string[];
  route: string;
  previewTitle: string;
  previewCards: PreviewCard[];
  actionLabel: string;
};

type ProductFeature = {
  title: string;
  route: string;
  detail: string;
  category: string;
  icon: typeof Bot;
  status: string;
};

const valueProps = [
  "Manuel takip yükünü azaltır.",
  "Dağınık İSG süreçlerini tek yapıda toplar.",
  "Denetim hazırlığını sürekli görünür kılar.",
];

const featureCards = [
  {
    title: "Risk analizi yönetimi",
    description: "Denetimler, uygunsuzluklar ve risk odaklı süreçler tek akışta ilerler.",
    icon: ShieldAlert,
  },
  {
    title: "Görev ve aksiyon takibi",
    description: "Geciken işler, açık aksiyonlar ve operasyon baskısı merkezi olarak yönetilir.",
    icon: Workflow,
  },
  {
    title: "Çalışan ve firma yönetimi",
    description: "Firma, çalışan ve sorumluluk takibi denetim ve belge süreçleriyle birlikte yürür.",
    icon: Building2,
  },
  {
    title: "OSGB operasyon yönetimi",
    description: "Personel, görevlendirme, kapasite, evrak ve finans modülleri bir arada çalışır.",
    icon: Briefcase,
  },
  {
    title: "Doküman ve plan akışı",
    description: "Atama yazıları, sertifikalar, yıllık planlar ve arşiv düzenli biçimde yönetilir.",
    icon: FileCheck2,
  },
  {
    title: "Bildirim ve hatırlatmalar",
    description: "Yaklaşan işlemler, açık görevler ve kritik uyarılar anlık olarak görünür olur.",
    icon: BellRing,
  },
];

const sectionLinks = [
  { label: "Ürün", id: "hero" },
  { label: "Özellikler", id: "ozellikler" },
  { label: "Akış", id: "akis" },
  { label: "Güven", id: "guven" },
  { label: "Fiyatlandırma", id: "fiyatlandirma" },
];

const productFeatures: ProductFeature[] = [
  { title: "Yönetici paneli", route: "/", detail: "KPI, kritik başlıklar ve günlük öncelik görünümü", category: "Merkez", icon: LayoutDashboard, status: "Canlı" },
  { title: "Denetimler", route: "/inspections", detail: "Saha kayıtları, bulgular ve rapor akışı", category: "Denetim", icon: ClipboardCheck, status: "Canlı" },
  { title: "Bildirimler", route: "/notifications", detail: "Yaklaşan işlemler ve kritik hatırlatmalar", category: "Denetim", icon: BellRing, status: "Canlı" },
  { title: "Çalışan yönetimi", route: "/employees", detail: "Çalışan bilgileri, durum ve takip kayıtları", category: "Operasyon", icon: Users, status: "Canlı" },
  { title: "Firma yönetimi", route: "/companies", detail: "Firma bazlı süreç ve sorumluluk görünümü", category: "Operasyon", icon: Building2, status: "Canlı" },
  { title: "Olay ve aksiyon takibi", route: "/incidents", detail: "Olay kayıtları, aksiyonlar ve süreç takibi", category: "Denetim", icon: Workflow, status: "Canlı" },
  { title: "Atama yazıları", route: "/assignment-letters", detail: "Belge üretimi ve düzenli arşiv akışı", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "Sertifikalar", route: "/dashboard/certificates", detail: "Belge merkezi ve geçmiş görünümü", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "Periyodik kontroller", route: "/periodic-controls", detail: "Kontrol kayıtları ve planlı takip", category: "Denetim", icon: ClipboardCheck, status: "Canlı" },
  { title: "Sağlık gözetimi", route: "/health-surveillance", detail: "Muayene ve takip tarihleri yönetimi", category: "Operasyon", icon: Users, status: "Canlı" },
  { title: "OSGB paneli", route: "/osgb/dashboard", detail: "OSGB operasyonunun merkezi görünümü", category: "OSGB", icon: Briefcase, status: "Canlı" },
  { title: "OSGB personel", route: "/osgb/personnel", detail: "Personel, rol ve uygunluk takibi", category: "OSGB", icon: Users, status: "Canlı" },
  { title: "OSGB görevlendirme", route: "/osgb/assignments", detail: "Atama ve iş yükü görünürlüğü", category: "OSGB", icon: Workflow, status: "Canlı" },
  { title: "Şirket takibi", route: "/osgb/company-tracking", detail: "Şirket bazlı süreç, durum ve takip", category: "OSGB", icon: Building2, status: "Canlı" },
  { title: "Kapasite yönetimi", route: "/osgb/capacity", detail: "Kapasite dengesi ve operasyon planlaması", category: "OSGB", icon: Briefcase, status: "Canlı" },
  { title: "OSGB uyarıları", route: "/osgb/alerts", detail: "Öncelikli operasyon ve risk uyarıları", category: "OSGB", icon: BellRing, status: "Canlı" },
  { title: "OSGB finans", route: "/osgb/finance", detail: "Finans akışı ve tahsilat görünürlüğü", category: "OSGB", icon: Briefcase, status: "Canlı" },
  { title: "OSGB dokümanlar", route: "/osgb/documents", detail: "Evrak, çıktı ve belge yönetimi", category: "OSGB", icon: FileCheck2, status: "Canlı" },
  { title: "OSGB görevler", route: "/osgb/tasks", detail: "Görevlerin tek ekranda operasyonel takibi", category: "OSGB", icon: Workflow, status: "Canlı" },
  { title: "Risk sihirbazı", route: "/risk-wizard", detail: "Adım adım risk değerlendirme akışı", category: "Denetim", icon: ShieldAlert, status: "Canlı" },
  { title: "Risk editörü", route: "/risk-editor", detail: "Detaylı risk düzenleme ve çıktı üretimi", category: "Denetim", icon: ShieldAlert, status: "Canlı" },
  { title: "Yıllık planlar", route: "/annual-plans", detail: "Plan oluşturma ve tarih bazlı yönetim", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "Acil durum planları", route: "/adep-plans", detail: "ADEP planları ve düzenli güncelleme akışı", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "İSG Bot", route: "/isg-bot", detail: "Yapay zekâ destekli analiz ve yorum katmanı", category: "AI", icon: Bot, status: "Canlı" },
  { title: "Bilgi kütüphanesi", route: "/safety-library", detail: "İSG içerikleri ve doküman erişimi", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "Raporlar", route: "/reports", detail: "Operasyon, denetim ve çıktı raporlaması", category: "Belge", icon: FileCheck2, status: "Canlı" },
  { title: "NACE sorgu", route: "/nace-query", detail: "Kod sorgulama ve sektör bazlı görünüm", category: "AI", icon: Sparkles, status: "Canlı" },
];

const featureCategories = ["Tümü", "Merkez", "Denetim", "Operasyon", "OSGB", "Belge", "AI"];

const moduleNodes: ModuleNode[] = [
  {
    title: "Yönetici Paneli",
    subtitle: "Kritik görünüm",
    icon: LayoutDashboard,
    className: "left-[6%] top-[14%]",
    glow: "from-cyan-400/20 to-sky-500/10",
    description:
      "Kritik riskler, geciken aksiyonlar ve operasyon baskısı yöneticiye karar odaklı bir görünümle sunulur.",
    tags: ["Dashboard", "KPI", "Öncelik"],
    route: "/",
    previewTitle: "Bugün odaklanılması gereken alanlar",
    actionLabel: "Paneli aç",
    previewCards: [
      { label: "Kritik başlık", value: "4 aktif", meta: "Öncelik sırası güncel", tone: "cyan" },
      { label: "Açık aksiyon", value: "12 görev", meta: "3 tanesi bugün bitmeli", tone: "amber" },
      { label: "Denetim baskısı", value: "2 kayıt", meta: "Rapor bekliyor", tone: "fuchsia" },
    ],
  },
  {
    title: "Denetimler",
    subtitle: "Saha akışı",
    icon: ClipboardCheck,
    className: "left-[8%] top-[58%]",
    glow: "from-emerald-400/20 to-cyan-500/10",
    description:
      "Denetim kayıtları, bulgular ve sahadan gelen aksiyon ihtiyaçları tek akışta takip edilir.",
    tags: ["Saha", "Bulgular", "Rapor"],
    route: "/inspections",
    previewTitle: "Denetim listesi mini görünümü",
    actionLabel: "Denetimleri aç",
    previewCards: [
      { label: "Son kayıt", value: "Üretim hattı", meta: "Risk seviyesi: orta", tone: "emerald" },
      { label: "Açık bulgu", value: "6 madde", meta: "2 tanesi kritik", tone: "rose" },
      { label: "Rapor durumu", value: "Hazır", meta: "PDF paylaşımı açık", tone: "cyan" },
    ],
  },
  {
    title: "İSG Bot",
    subtitle: "Akıllı destek",
    icon: Bot,
    className: "left-[39%] top-[4%]",
    glow: "from-fuchsia-400/20 to-violet-500/10",
    description:
      "Yapay zekâ katmanı analiz, öneri ve hızlı yorum desteği vererek operasyonun karar hızını artırır.",
    tags: ["AI", "Öneri", "Analiz"],
    route: "/isg-bot",
    previewTitle: "Akıllı destek akışı",
    actionLabel: "İSG Bot'a git",
    previewCards: [
      { label: "Son istek", value: "Risk özeti", meta: "12 saniyede hazırlandı", tone: "fuchsia" },
      { label: "Öneri", value: "3 aksiyon", meta: "Öncelik sırasına göre", tone: "cyan" },
      { label: "Durum", value: "Aktif", meta: "Analiz katmanı hazır", tone: "emerald" },
    ],
  },
  {
    title: "OSGB Modülü",
    subtitle: "Operasyon merkezi",
    icon: Users,
    className: "left-[39%] top-[66%]",
    glow: "from-amber-300/20 to-orange-500/10",
    description:
      "Personel, görevlendirme, kapasite ve şirket yönetimi tek operasyon omurgasında birleşir.",
    tags: ["OSGB", "Atama", "Kapasite"],
    route: "/osgb/dashboard",
    previewTitle: "OSGB operasyon görünümü",
    actionLabel: "OSGB panelini aç",
    previewCards: [
      { label: "Atama durumu", value: "18 plan", meta: "2 tanesi yaklaşan tarih", tone: "amber" },
      { label: "Kapasite", value: "%82 dolu", meta: "Yeni görev için alan var", tone: "cyan" },
      { label: "Personel", value: "36 aktif", meta: "Tüm liste güncel", tone: "emerald" },
    ],
  },
  {
    title: "Belge Yönetimi",
    subtitle: "Plan ve evrak",
    icon: FileCheck2,
    className: "right-[8%] top-[16%]",
    glow: "from-slate-100/10 to-cyan-500/10",
    description:
      "Atama yazıları, planlar, sertifikalar ve kurumsal belge takibi düzenli şekilde yönetilir.",
    tags: ["Belgeler", "Plan", "Arşiv"],
    route: "/assignment-letters",
    previewTitle: "Belge üretim mini görünümü",
    actionLabel: "Belgelere git",
    previewCards: [
      { label: "Belge türü", value: "Atama yazısı", meta: "Hazır şablon kullanılıyor", tone: "slate" },
      { label: "Oluşturma", value: "Tek tık", meta: "Firma verisi otomatik doluyor", tone: "cyan" },
      { label: "Arşiv", value: "Düzenli", meta: "Geçmiş kayıtlar erişilebilir", tone: "emerald" },
    ],
  },
  {
    title: "Bildirimler",
    subtitle: "Yaklaşan işlemler",
    icon: BellRing,
    className: "right-[6%] top-[58%]",
    glow: "from-rose-300/20 to-amber-400/10",
    description:
      "Yaklaşan tarihler, geciken görevler ve dikkat isteyen durumlar görünür ve izlenebilir olur.",
    tags: ["Hatırlatma", "Takip", "Görev"],
    route: "/notifications",
    previewTitle: "Bildirim akışı mini görünümü",
    actionLabel: "Bildirimleri aç",
    previewCards: [
      { label: "Yaklaşan işlem", value: "5 kayıt", meta: "Bu hafta tamamlanmalı", tone: "rose" },
      { label: "Öncelik", value: "Yüksek", meta: "2 kritik hatırlatma var", tone: "amber" },
      { label: "Okunma", value: "%78", meta: "Ekip görünürlüğü iyi", tone: "cyan" },
    ],
  },
];

const workFlowSteps = [
  {
    step: "01",
    title: "Firma ve çalışan bilgilerini yönetin",
    description: "Firma, çalışan ve sorumlu bilgilerini düzenli ve erişilebilir tutun.",
  },
  {
    step: "02",
    title: "İSG süreçlerini dijital olarak takip edin",
    description: "Görevleri, belgeleri, denetimleri ve aksiyonları tek sistem üzerinden izleyin.",
  },
  {
    step: "03",
    title: "Denetim ve raporlama süreçlerini yönetin",
    description: "Denetime hazırlığı görünür kılın, kayıtları yönetin ve çıktıları tek yerden üretin.",
  },
];

const problemSolution = [
  { problem: "Dağınık evrak takibi", solution: "Belge ve plan süreçleri tek yapıda toplanır." },
  { problem: "Manuel kontrol süreçleri", solution: "Görev, bildirim ve operasyon akışları merkezi hale gelir." },
  { problem: "Geciken aksiyonlar", solution: "Açık işler ve kritik başlıklar yönetici ekranında görünür olur." },
  { problem: "Denetim hazırlığında eksikler", solution: "Denetim, uygunsuzluk ve belge akışı tek omurgada yürür." },
  { problem: "Çalışan ve firma bazlı takip zorluğu", solution: "Firma, çalışan ve OSGB modülleri birbiriyle bağlantılı çalışır." },
];

const trustMetrics = [
  { label: "Aktif kullanıcı alanı", value: "2460+" },
  { label: "Oluşturulan kayıtlar", value: "50K+" },
  { label: "Yönetilen süreç alanı", value: "12+" },
];

const companyMarks = [
  "Kurum içi İSG ekipleri",
  "OSGB operasyon ekipleri",
  "Çok şubeli yapılar",
  "Profesyonel danışmanlık ekipleri",
];

const logoSlots = [
  "Kurumsal referans",
  "OSGB iş ortağı",
  "Saha operasyonu",
  "Danışman ekip",
  "Çok şubeli yapı",
  "Profesyonel çözüm",
];

const pricingPlans = [
  {
    title: "Başlangıç",
    description: "Temel İSG süreçlerini dijitalleştirmek isteyen ekipler için.",
    highlight: "Firma, çalışan, denetim ve görev yönetimi",
    salesCopy: "İlk dijitalleşme adımını düşük sürtünmeyle başlatır.",
    cta: "Başlangıç planını incele",
    recommended: false,
  },
  {
    title: "Profesyonel",
    description: "Belge, rapor ve operasyon takibini büyüten yapılar için.",
    highlight: "OSGB modülü, bildirimler ve detaylı süreç takibi",
    salesCopy: "Operasyon görünürlüğünü artıran en dengeli kullanım modeli.",
    cta: "Profesyonel planla başla",
    recommended: true,
  },
  {
    title: "Kurumsal",
    description: "Çok ekipli ve yoğun operasyon yöneten kurumlar için.",
    highlight: "Genişletilmiş modül kapsamı ve kurumsal onboarding",
    salesCopy: "Ölçeklenen kurumlar için standartlı ve yönetilebilir yapı sunar.",
    cta: "Kurumsal demo talep et",
    recommended: false,
  },
];

const previewToneClass: Record<string, string> = {
  cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  fuchsia: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100",
  slate: "border-slate-300/15 bg-white/[0.06] text-slate-100",
};

function RevealSection({
  children,
  delay = 0,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      {...props}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(28px)",
        transition: `opacity 800ms ease ${delay}ms, transform 800ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(moduleNodes[2].title);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const activeModuleDetails = useMemo(
    () => moduleNodes.find((node) => node.title === activeModule) ?? moduleNodes[2],
    [activeModule],
  );
  const filteredFeatures = useMemo(
    () =>
      activeCategory === "Tümü"
        ? productFeatures
        : productFeatures.filter((feature) => feature.category === activeCategory),
    [activeCategory],
  );
  const marqueeLogos = [...logoSlots, ...logoSlots];
  const ActiveModuleIcon = activeModuleDetails.icon;
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070b15] text-white">
      <style>{`
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes landingFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes landingPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.72; }
        }
        @keyframes landingBeam {
          0%, 100% { opacity: 0.15; transform: scaleX(0.98); }
          50% { opacity: 0.42; transform: scaleX(1.02); }
        }
        @keyframes landingMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .landing-fade-up {
          opacity: 0;
          transform: translateY(24px);
          animation: landingFadeUp 0.75s ease forwards;
        }
        .landing-float {
          animation: landingFloat 6s ease-in-out infinite;
        }
        .landing-pulse {
          animation: landingPulse 4s ease-in-out infinite;
        }
        .landing-beam {
          animation: landingBeam 5s ease-in-out infinite;
          transform-origin: center;
        }
        .landing-marquee {
          width: max-content;
          animation: landingMarquee 24s linear infinite;
        }
      `}</style>

      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_16%_14%,rgba(34,211,238,0.08),transparent_22%),radial-gradient(circle_at_84%_16%,rgba(124,58,237,0.12),transparent_24%),radial-gradient(circle_at_60%_80%,rgba(17,24,39,0.95),transparent_28%),linear-gradient(180deg,#060912_0%,#090d18_45%,#070b14_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.6)_1px,transparent_1px)] [background-size:104px_104px]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(17,24,39,0.4),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.05),transparent_26%)]" />

      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header
          className="landing-fade-up sticky top-4 z-30 flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">İSGVİZYON</p>
              <p className="text-xs text-slate-400">Yeni nesil İSG yönetim sistemi</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
              Yapay zekâ destekli
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
              Kurumsal ve profesyonel kullanım
            </Badge>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {sectionLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="rounded-full px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-200 hover:bg-white/10"
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              className="hidden text-slate-200 hover:bg-white/10 sm:inline-flex"
              onClick={() => navigate("/auth")}
            >
              Giriş Yap
            </Button>
            <Button
              className="gap-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              onClick={() => navigate("/auth")}
            >
              Ücretsiz Başla
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {mobileMenuOpen ? (
          <div className="landing-fade-up mt-4 rounded-[28px] border border-white/10 bg-[#0f1626]/95 p-4 backdrop-blur-xl lg:hidden">
            <div className="grid gap-2">
              {sectionLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-cyan-400/20 hover:bg-white/[0.06]"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/10" onClick={() => navigate("/auth")}>
                Giriş Yap
              </Button>
              <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => navigate("/auth")}>
                Ücretsiz Başla
              </Button>
            </div>
          </div>
        ) : null}

        <main className="flex flex-1 flex-col gap-12 py-10 lg:py-12">
          <section
            id="hero"
            className="landing-fade-up grid gap-10 2xl:grid-cols-[1.02fr_0.98fr] 2xl:items-center"
            style={{ animationDelay: "0.12s" }}
          >
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-cyan-100">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Akıllı ve profesyonel İSG platformu
                </Badge>
              </div>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-[3rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[4.1rem] xl:text-[5rem]">
                  İSGVİZYON
                </h1>
                <p className="max-w-4xl text-[1.4rem] font-medium leading-tight tracking-[-0.035em] text-slate-100 sm:text-[1.9rem] xl:text-[2.2rem]">
                  İSG süreçlerinizi dijitalleştirin, yönetin ve denetimlere her zaman hazır olun.
                </p>
                <p className="max-w-2xl text-[15px] leading-8 text-slate-300 sm:text-base">
                  İSGVİZYON; manuel evrak yükünü, dağınık takip süreçlerini ve denetim hazırlığındaki
                  belirsizliği ortadan kaldırmak için tasarlandı. Daha hızlı, daha düzenli ve daha
                  profesyonel bir yönetim deneyimi sunar.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 gap-2 rounded-2xl bg-cyan-400 px-7 text-base font-medium text-slate-950 hover:bg-cyan-300"
                  onClick={() => navigate("/auth")}
                >
                  Ücretsiz Başla
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-7 text-base text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/auth")}
                >
                  Demo İncele
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {valueProps.map((item, index) => (
                  <div
                    key={item}
                    className="landing-fade-up rounded-[24px] border border-white/10 bg-white/[0.035] p-5 transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-400/20"
                    style={{ animationDelay: `${0.22 + index * 0.06}s` }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <p className="mt-3 text-sm leading-7 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="landing-fade-up rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,33,0.96),rgba(10,16,28,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: "0.18s" }}
            >
              <div className="flex items-center justify-between border-b border-white/6 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Canlı sistem ağı</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Hover ile modül bağlantılarını ve rolünü inceleyin
                  </p>
                </div>
                <Badge className="border-emerald-400/15 bg-emerald-500/10 text-emerald-200">
                  Sistem aktif
                </Badge>
              </div>

              <div className="relative mt-6 grid gap-5">
                <div className="relative h-[440px] overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.75),rgba(9,13,23,0.96))]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_34%),radial-gradient(circle_at_55%_45%,rgba(139,92,246,0.08),transparent_30%)]" />
                  <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10 landing-pulse" />
                  <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/10 landing-pulse" style={{ animationDelay: "1.4s" }} />
                  <div className="absolute left-1/2 top-1/2 h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-4 text-center shadow-[0_0_80px_rgba(34,211,238,0.12)]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                      <Bot className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">İSG Bot</p>
                    <p className="mt-1 text-xs text-slate-300">Akıllı koordinasyon</p>
                  </div>
                  <div className="absolute left-[24%] top-[23%] h-px w-[21%] rotate-[18deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent landing-beam" />
                  <div className="absolute left-[24%] top-[63%] h-px w-[21%] -rotate-[16deg] bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent landing-beam" style={{ animationDelay: "1s" }} />
                  <div className="absolute right-[24%] top-[24%] h-px w-[21%] -rotate-[18deg] bg-gradient-to-r from-transparent via-fuchsia-300/45 to-transparent landing-beam" style={{ animationDelay: "2s" }} />
                  <div className="absolute right-[23%] top-[63%] h-px w-[21%] rotate-[14deg] bg-gradient-to-r from-transparent via-amber-300/45 to-transparent landing-beam" style={{ animationDelay: "1.6s" }} />
                  <div className="absolute left-[44%] top-[17%] h-[14%] w-px bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent landing-beam" style={{ animationDelay: "0.8s" }} />
                  <div className="absolute left-[55%] top-[68%] h-[12%] w-px bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent landing-beam" style={{ animationDelay: "1.8s" }} />

                  {moduleNodes.map((node, index) => {
                    const Icon = node.icon;
                    const isActive = activeModule === node.title;
                    return (
                      <div
                        key={node.title}
                        className={`landing-float absolute ${node.className} w-[156px] cursor-pointer rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 ${
                          isActive ? "border-cyan-400/30" : "border-white/10 hover:border-cyan-400/20"
                        }`}
                        style={{ animationDelay: `${index * 0.7}s` }}
                        onMouseEnter={() => setActiveModule(node.title)}
                        onFocus={() => setActiveModule(node.title)}
                        onClick={() => setActiveModule(node.title)}
                        tabIndex={0}
                      >
                        <div className={`absolute inset-0 rounded-[24px] bg-gradient-to-br ${node.glow} ${isActive ? "opacity-90" : "opacity-60"}`} />
                        <div className="relative">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200">
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-white">{node.title}</p>
                          <p className="mt-1 text-xs text-slate-300">{node.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[30px] border border-white/8 bg-[#101726] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Aktif modül</p>
                  <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                        <ActiveModuleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{activeModuleDetails.title}</p>
                        <p className="text-sm text-slate-400">{activeModuleDetails.subtitle}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-300">{activeModuleDetails.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {activeModuleDetails.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[20px] border border-white/8 bg-[#0c1423] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mini preview</p>
                        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                          {activeModuleDetails.route}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium text-white">{activeModuleDetails.previewTitle}</p>
                      <div className="mt-4 space-y-3">
                        {activeModuleDetails.previewCards.map((card) => (
                          <div key={card.label} className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                                <p className="mt-2 text-sm font-medium text-white">{card.value}</p>
                              </div>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${previewToneClass[card.tone]}`}>
                                Aktif
                              </span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${
                                  card.tone === "emerald"
                                    ? "from-emerald-400 to-cyan-300"
                                    : card.tone === "amber"
                                      ? "from-amber-400 to-orange-300"
                                      : card.tone === "rose"
                                        ? "from-rose-400 to-amber-300"
                                        : card.tone === "fuchsia"
                                          ? "from-fuchsia-400 to-violet-300"
                                          : card.tone === "slate"
                                            ? "from-slate-200/70 to-cyan-300/70"
                                            : "from-cyan-400 to-sky-300"
                                }`}
                                style={{
                                  width:
                                    card.tone === "emerald"
                                      ? "74%"
                                      : card.tone === "amber"
                                        ? "82%"
                                        : card.tone === "rose"
                                          ? "68%"
                                          : card.tone === "fuchsia"
                                            ? "88%"
                                            : card.tone === "slate"
                                              ? "64%"
                                              : "79%",
                                }}
                              />
                            </div>
                            <p className="mt-3 text-xs text-slate-400">{card.meta}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="mt-4 w-full gap-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                        onClick={() => navigate(activeModuleDetails.route)}
                      >
                        {activeModuleDetails.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sistem mantığı</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        Modüller tek bir operasyon omurgası üzerinde çalışır. Hover ettiğiniz her kart bu yapının farklı bir iş katmanını temsil eder.
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-emerald-400/12 bg-emerald-500/[0.06] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Canlı fayda</p>
                      <p className="mt-2 text-sm leading-7 text-slate-200">
                        Kullanıcıya tek bir ekran görüntüsü değil, çalışan bir sistemin parçalarının nasıl bir araya geldiği gösterilir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <RevealSection id="ozellikler" delay={40} className="rounded-[34px] border border-white/10 bg-white/[0.035] p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Özellikler</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Uygulamadaki modüller tek bakışta görülebilir.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                Aşağıdaki kartlar İSGVİZYON içinde yer alan gerçek ekranları temsil eder. Kullanıcı,
                ürünün hangi iş alanlarını kapsadığını bu bölümde doğrudan görebilir.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-2">
                {featureCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      activeCategory === category
                        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {filteredFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                <button
                  key={feature.route}
                  type="button"
                  onClick={() => navigate(feature.route)}
                  className="group rounded-[26px] border border-white/10 bg-[#0f1626] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#121b2f]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                      <p className="text-lg font-medium text-white">{feature.title}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{feature.detail}</p>
                    </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                        {feature.status}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {feature.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {feature.route}
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-sm text-cyan-200">
                    Modüle git
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </button>
              )})}
            </div>
          </RevealSection>

          <RevealSection delay={60} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xl font-medium text-white">{card.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
                </div>
              );
            })}
          </RevealSection>

          <section id="akis" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <RevealSection delay={80} className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nasıl çalışır?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Süreçler tek bir mantıkta ilerler.
              </h2>
              <div className="mt-7 space-y-4">
                {workFlowSteps.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-[24px] border border-white/10 bg-[#101726] p-5 transition-colors duration-300 hover:border-cyan-400/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                        {item.step}
                      </div>
                      <p className="text-base font-medium text-white">{item.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </RevealSection>

            <RevealSection delay={120} className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Problem / Çözüm</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Dağınık İSG işlerini yönetilebilir hale getirir.
              </h2>
              <div className="mt-7 space-y-3">
                {problemSolution.map((item) => (
                  <div
                    key={item.problem}
                    className="grid gap-3 rounded-[24px] border border-white/10 bg-[#101726] p-5 md:grid-cols-[0.9fr_1.1fr]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-rose-200/70">Sorun</p>
                      <p className="mt-2 text-sm font-medium text-white">{item.problem}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Çözüm</p>
                      <p className="mt-2 text-sm text-slate-300">{item.solution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RevealSection>
          </section>

          <RevealSection id="guven" delay={140} className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.82),rgba(15,23,42,0.94))] p-7">
            <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Güven katmanı</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Kurumsal kullanım için düzenli, izlenebilir ve güven veren yapı.
                </h2>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-slate-200">KVKK uyumuna uygun veri yaklaşımı</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-slate-200">Profesyonel veri yönetimi ve süreç takibi</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-slate-200">Kurumsal kullanıma uygun düzenli operasyon hissi</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {trustMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-center transition-transform duration-300 hover:-translate-y-1"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                    <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>

          <RevealSection delay={160} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Müşteri güveni</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Farklı ekip yapıları için kurumsal kullanım hissi.
              </h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {companyMarks.map((mark) => (
                  <div
                    key={mark}
                    className="rounded-[22px] border border-white/10 bg-[#101726] p-4 text-sm text-slate-200 transition-colors duration-300 hover:border-cyan-400/20"
                  >
                    {mark}
                  </div>
                ))}
              </div>

              <div className="relative mt-6 overflow-hidden rounded-[28px] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02))] p-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#0d1423] via-[#0d1423]/80 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#0d1423] via-[#0d1423]/80 to-transparent" />
                <div className="landing-marquee flex gap-4">
                  {marqueeLogos.map((logo, index) => (
                    <div
                      key={`${logo}-${index}`}
                      className="flex min-w-[220px] items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.06] px-5 py-6 text-center text-xs uppercase tracking-[0.2em] text-slate-200 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
                    >
                      {logo}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-[#101726] p-5">
                <p className="text-sm leading-7 text-slate-200">
                  Bu alan; gerçek müşteri logoları, referans şirketler ve sektörel kullanım örnekleri için hazırlandı. Yerleşim ve hareket dili, güven veren kurumsal görünüm için ayarlandı.
                </p>
              </div>
            </div>

            <div id="fiyatlandirma" className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(16,21,34,0.96),rgba(10,15,25,0.92))] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fiyatlandırma yaklaşımı</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Kullanım yoğunluğuna göre netleşen, satışa açık paket yapısı.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Küçük ekipler için hızlı başlangıç, büyüyen operasyonlar için daha görünür süreç yönetimi, kurumsal yapılar için ise genişletilmiş modül kapsamı sunulabilir.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.title}
                    className={`relative rounded-[26px] border p-5 transition-all duration-300 hover:-translate-y-1 ${
                      plan.recommended
                        ? "border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.04))] shadow-[0_20px_60px_rgba(34,211,238,0.08)]"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    {plan.recommended ? (
                      <Badge className="absolute right-4 top-4 border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                        Önerilen plan
                      </Badge>
                    ) : null}
                    <p className="text-lg font-semibold text-white">{plan.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{plan.description}</p>
                    <div className="mt-5 rounded-[18px] border border-white/8 bg-[#101726] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Uygun yapı</p>
                      <p className="mt-2 text-sm text-slate-200">{plan.highlight}</p>
                    </div>
                    <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Değer önerisi</p>
                      <p className="mt-2 text-sm text-slate-200">{plan.salesCopy}</p>
                    </div>
                    <Button
                      className={`mt-5 w-full rounded-2xl ${
                        plan.recommended
                          ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                      }`}
                      onClick={() => navigate("/auth")}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-[24px] border border-cyan-400/12 bg-cyan-400/[0.06] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Ekibinize uygun planı birlikte netleştirelim.</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Modül kapsamı, ekip yapısı ve kullanım yoğunluğuna göre doğru başlangıç modelini belirleyin.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      className="h-14 gap-2 rounded-2xl bg-cyan-400 px-7 text-base font-medium text-slate-950 hover:bg-cyan-300"
                      onClick={() => navigate("/auth")}
                    >
                      Ücretsiz Başla
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-7 text-base text-slate-100 hover:bg-white/10"
                      onClick={() => navigate("/auth")}
                    >
                      Demo İncele
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </main>
      </div>
    </div>
  );
}
