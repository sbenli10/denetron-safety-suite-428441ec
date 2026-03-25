import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  Layers3,
  LayoutDashboard,
  LineChart,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featureColumns = [
  {
    title: "Saha ve Uygunsuzluk",
    eyebrow: "Denetim akisi",
    items: [
      "Denetimler ve kontrol listeleri",
      "Dof ve bulk Dof surecleri",
      "Incident ve aksiyon yonetimi",
      "Rapor uretimi ve paylasim",
    ],
    icon: ScanSearch,
    tint: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  {
    title: "OSGB Operasyonu",
    eyebrow: "Portfoy kontrolu",
    items: [
      "OSGB dashboard ve sirket takibi",
      "Personel, atama ve kapasite gorunumu",
      "Uyari merkezi, finans ve evrak takibi",
      "Gorev motoru ve operasyon notlari",
    ],
    icon: Briefcase,
    tint: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    title: "Belge ve Planlama",
    eyebrow: "Yonetim kati",
    items: [
      "Atama yazilari ve sertifika merkezi",
      "Kurul toplantilari ve yillik planlar",
      "ADEP ve tahliye editorleri",
      "Risk sihirbazi, NACE ve bilgi kutuphanesi",
    ],
    icon: FileCheck,
    tint: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
];

const moduleGrid = [
  {
    title: "Yonetici Dashboard",
    description: "Kritik risk, geciken is ve saha ritmini tek hikayede gosteren karar paneli.",
    icon: LayoutDashboard,
  },
  {
    title: "Denetimler",
    description: "Liste-first hizli acilis, detay talep aninda ve rapora dogrudan cikis.",
    icon: ShieldAlert,
  },
  {
    title: "OSGB Modulu",
    description: "Portfoy, personel, atama, finans, uyari ve kapasiteyi ayni sistemde toplar.",
    icon: Building2,
  },
  {
    title: "Belgeler ve Evrak",
    description: "Evrak gecerlilik takibi, sorumluluk ve yenileme gorevlerini merkezi izler.",
    icon: FolderKanban,
  },
  {
    title: "Risk ve ADEP",
    description: "Sihirbaz tabanli olusturma akislari ile plan cikislarini hizlandirir.",
    icon: Workflow,
  },
  {
    title: "ISG Bot",
    description: "Operasyon sorulari ve yardimci analizler icin sistem icinden destek katmani.",
    icon: Bot,
  },
];

const trustSignals = [
  {
    title: "Tek merkezden operasyon",
    description: "Daginik Excel, not ve evrak trafigini tek urun akisina toplar.",
    icon: Layers3,
  },
  {
    title: "Hizli acilis, gecikmesiz his",
    description: "Cache-first ekranlar kullaniciya bos bekleme yerine hemen baglam verir.",
    icon: Gauge,
  },
  {
    title: "Yonetim dilinde gorunum",
    description: "Veriyi sadece listelemez; oncelik, baski ve aksiyon cikarir.",
    icon: LineChart,
  },
];

const buyerPoints = [
  "OSGB yoneticisi, operasyon sorumlusu ve saha ekibi ayni sistem uzerinde calisir.",
  "Denetim, uygunsuzluk, belge ve plan surecleri birbirinden kopuk kalmaz.",
  "Yakin bitis tarihleri, kritik riskler ve acik aksiyonlar manuel takibe kalmaz.",
  "Musteri tarafina daha profesyonel, hizli ve standart bir hizmet sunulur.",
];

const workflow = [
  {
    step: "01",
    title: "Sisteme gir ve tabloyu gor",
    description: "Ilk ekranda aktif risk, geciken isler, kritik firmalar ve operasyon baskisi net olsun.",
  },
  {
    step: "02",
    title: "Module gir ve isi bitir",
    description: "Denetim, atama, evrak veya plan olusturma sureci ek ekran aramadan ilerlesin.",
  },
  {
    step: "03",
    title: "Raporu ve ciktisini ver",
    description: "Olusan is dogrudan paylasim, cikti veya takip aksiyonuna donussun.",
  },
];

const stats = [
  { label: "Ana moduller", value: "12+" },
  { label: "Calisma ekranlari", value: "35+" },
  { label: "Operasyon katmanlari", value: "4" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.18),transparent_22%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_70%_70%,rgba(245,158,11,0.10),transparent_28%),linear-gradient(180deg,#04101d_0%,#081220_45%,#0b1320_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">DENETRON</p>
              <p className="text-xs text-slate-400">ISG operasyon sistemi</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              Premium operasyon paneli
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1 text-slate-200">
              Dashboard + OSGB + Belge + Plan
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-slate-200 hover:bg-white/10"
              onClick={() => navigate("/auth")}
            >
              Giris yap
            </Button>
            <Button
              className="gap-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              onClick={() => navigate("/auth")}
            >
              Demo akisini ac
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-12 py-8 lg:py-10">
          <section className="grid gap-8 xl:grid-cols-[1.04fr_0.96fr] xl:items-stretch">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,20,32,0.94),rgba(7,14,24,0.86))] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.34)] sm:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                  Safety operations system
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                  Cache-first yukleme modeli
                </Badge>
              </div>

              <div className="mt-8 max-w-4xl space-y-5">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">
                  Kurumsal kontrol kati
                </p>
                <h1 className="text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-5xl xl:text-[5.4rem]">
                  Denetimden evraga, OSGB portfoyunden aksiyona kadar tum is akisiniz tek urunde toplansin.
                </h1>
                <p className="max-w-3xl text-[15px] leading-8 text-slate-300 sm:text-[17px]">
                  Denetron sadece kayit tutan bir ISG uygulamasi degil. Yoneticiye neyin geciktigini, hangi
                  firmada baski olustugunu, hangi ekibin yuk altinda kaldigini ve hangi belgenin yenilenmesi
                  gerektigini gosteren premium bir operasyon katmani.
                </p>
              </div>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300"
                  onClick={() => navigate("/auth")}
                >
                  Panele gec
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/10 bg-white/5 px-6 text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/osgb")}
                >
                  OSGB modullerini gor
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Neden satin alinabilir?</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                      Musteriye profesyonel his veren, ekibe zaman kazandiran ekranlar.
                    </h2>
                  </div>
                  <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 lg:flex">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {buyerPoints.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-slate-950/35 p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-slate-200">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[34px] border border-cyan-400/10 bg-[linear-gradient(155deg,rgba(34,211,238,0.10),rgba(8,15,23,0.88))] p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {trustSignals.map((signal) => {
                    const Icon = signal.icon;
                    return (
                      <div
                        key={signal.title}
                        className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-base font-medium text-white">{signal.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{signal.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/70">Tum urun gorunumu</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  Kullanici urunde neler oldugunu tek bakista gorsun.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-300">
                Bu blok satis sayfasi gibi davranir: urunun kapsamini acikca gosterir, hangi ekipler icin
                uygun oldugunu anlatir ve ziyaretciyi "bu urun bizim operasyonumu toplar" sonucuna goturur.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {featureColumns.map((column) => {
                const Icon = column.icon;
                return (
                  <div
                    key={column.title}
                    className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,29,0.95),rgba(6,12,21,0.92))] p-6"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${column.tint}`} />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{column.eyebrow}</p>
                          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                            {column.title}
                          </h3>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        {column.items.map((item) => (
                          <div
                            key={item}
                            className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-black/20 p-4"
                          >
                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                            <p className="text-sm leading-6 text-slate-200">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,18,31,0.94),rgba(7,14,23,0.88))] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Modul vitrini</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                    Uygulamanin en guclu alanlari
                  </h2>
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {moduleGrid.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-lg font-medium text-white">{module.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{module.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Musteri akisi</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                Satin alma kararina giden is mantigi
              </h2>
              <div className="mt-7 space-y-4">
                {workflow.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-[24px] border border-white/10 bg-slate-950/30 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                        {item.step}
                      </div>
                      <p className="text-lg font-medium text-white">{item.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-5">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-200" />
                  <p className="text-base font-medium text-white">Temel satis mesaji</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-50/90">
                  Denetron; denetim, gorev, evrak, OSGB portfoyu ve planlama surecini ayrik ekranlar degil,
                  tek operasyon omurgasi olarak sunar. Satin alma sebebi tam olarak budur.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(130deg,rgba(34,211,238,0.13),rgba(8,14,23,0.94)_42%,rgba(245,158,11,0.08))] p-7 sm:p-10">
            <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/70">Hazir cagri</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  Uygulamanin tum gucunu bir bakista gosteren landing artik hazir. Siradaki adim, ziyaretciyi
                  hizli demo ve urun akisina sokmak.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Giris ekranina giden tek CTA yerine, daha sonra canli demo, fiyatlandirma veya talep formu
                  eklemek icin uygun bir iskelet olusturuldu.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => navigate("/auth")}
                >
                  Uygulamayi ac
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/osgb/dashboard")}
                >
                  OSGB dashboarda git
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
