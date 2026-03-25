import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  LineChart,
  ShieldAlert,
  Users,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const primaryFeatures = [
  {
    title: "Yönetici paneli",
    description:
      "Kritik riskler, geciken işler ve operasyon yoğunluğu tek bakışta görünür.",
    icon: LayoutDashboard,
  },
  {
    title: "Denetim ve DÖF akışı",
    description:
      "Denetimler, uygunsuzluklar, rapor üretimi ve takip aksiyonları aynı akışta ilerler.",
    icon: ClipboardCheck,
  },
  {
    title: "OSGB operasyon modülü",
    description:
      "Personel, atama, kapasite, finans, uyarı ve firma takibi tek omurgada birleşir.",
    icon: Briefcase,
  },
];

const moduleGroups = [
  {
    title: "Saha yönetimi",
    icon: ShieldAlert,
    items: [
      "Denetimler ve kontrol listeleri",
      "DÖF ve toplu aksiyon yönetimi",
      "Olay ve uygunsuzluk takibi",
      "Rapor ve paylaşım çıktıları",
    ],
    tone: "border-cyan-500/15 bg-cyan-500/[0.05]",
  },
  {
    title: "OSGB yönetimi",
    icon: Building2,
    items: [
      "OSGB gösterge paneli",
      "Personel ve görevlendirme",
      "Kapasite ve süre analizi",
      "Finans, evrak ve görev yönetimi",
    ],
    tone: "border-emerald-500/15 bg-emerald-500/[0.05]",
  },
  {
    title: "Planlama ve belge",
    icon: FileCheck2,
    items: [
      "Atama yazıları ve sertifika merkezi",
      "Kurul toplantıları ve yıllık planlar",
      "Acil durum planı ve tahliye editörü",
      "Risk sihirbazı ve NACE araçları",
    ],
    tone: "border-amber-500/15 bg-amber-500/[0.05]",
  },
];

const trustPoints = [
  {
    title: "Tek merkezden operasyon",
    description:
      "Dağınık Excel, not ve evrak trafiğini tek çalışma modeline indirir.",
    icon: Workflow,
  },
  {
    title: "Hızlı açılış deneyimi",
    description:
      "Kritik ekranlar son bilinen veriyi hemen gösterir, güncel veri arka planda yenilenir.",
    icon: Gauge,
  },
  {
    title: "Yönetim dilinde görünürlük",
    description:
      "Ham veri yerine öncelik, baskı ve aksiyon ihtiyacı gösterilir.",
    icon: LineChart,
  },
];

const buyerReasons = [
  "OSGB yöneticisi, operasyon sorumlusu ve saha ekibi aynı sistem üzerinde çalışır.",
  "Denetim, belge, plan ve görev süreçleri birbirinden kopuk kalmaz.",
  "Yaklaşan bitiş tarihleri ve kritik riskler manuel takibe bırakılmaz.",
  "Müşteri tarafına daha hızlı, daha düzenli ve daha profesyonel hizmet sunulur.",
];

const footerModules = [
  {
    title: "Dashboard",
    description: "Karar destekli ana panel",
    icon: LayoutDashboard,
  },
  {
    title: "Denetimler",
    description: "Saha kayıt ve rapor akışı",
    icon: ShieldAlert,
  },
  {
    title: "OSGB",
    description: "Portföy ve operasyon katmanı",
    icon: Users,
  },
  {
    title: "İSG Bot",
    description: "Yardımcı analiz ve destek",
    icon: Bot,
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#06101a] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(20,184,166,0.08),transparent_22%),linear-gradient(180deg,#07111b_0%,#0b1520_52%,#0d1722_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:96px_96px]" />

      <div className="mx-auto flex min-h-screen max-w-[1360px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">DENETRON</p>
              <p className="text-xs text-slate-400">İSG operasyon sistemi</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-cyan-400/15 bg-cyan-400/10 text-cyan-100">
              Premium operasyon paneli
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/[0.05] text-slate-200">
              Dashboard + OSGB + Plan + Belge
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-slate-200 hover:bg-white/10"
              onClick={() => navigate("/auth")}
            >
              Giriş yap
            </Button>
            <Button
              className="gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              onClick={() => navigate("/auth")}
            >
              Panele geç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 py-8 lg:py-10">
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(8,18,29,0.95),rgba(10,18,28,0.88))] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-cyan-400/15 bg-cyan-400/10 text-cyan-100">
                  Kurumsal kontrol katmanı
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.05] text-slate-200">
                  Hızlı açılış deneyimi
                </Badge>
              </div>

              <div className="mt-8 max-w-4xl space-y-5">
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/70">
                  Safety operations platform
                </p>
                <h1 className="max-w-4xl text-[2.65rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[3.4rem] xl:text-[4.4rem]">
                  Denetimden belge yönetimine, OSGB operasyonundan aksiyon takibine kadar tüm iş akışınızı tek üründe toplayın.
                </h1>
                <p className="max-w-2xl text-[15px] leading-8 text-slate-300 sm:text-base">
                  Denetron; saha verisini yalnızca kaydetmez. Kritik riskleri, geciken işleri, operasyon yoğunluğunu
                  ve yenilenmesi gereken belge akışlarını yöneticinin önüne düzenli, hızlı ve karar verilebilir bir
                  yapıda çıkarır.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-cyan-300 px-6 text-slate-950 hover:bg-cyan-200"
                  onClick={() => navigate("/auth")}
                >
                  Uygulamayı aç
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/10 bg-white/[0.05] px-6 text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/osgb")}
                >
                  OSGB modüllerini incele
                </Button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {primaryFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-base font-medium text-white">{feature.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Neden tercih edilir?</p>
                <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-[-0.04em] text-white">
                  Düzenli görünen, hızlı hissettiren ve müşteriye güven veren bir çalışma sistemi.
                </h2>

                <div className="mt-6 space-y-3">
                  {buyerReasons.map((reason) => (
                    <div
                      key={reason}
                      className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-slate-950/35 p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-slate-200">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {trustPoints.map((point) => {
                  const Icon = point.icon;
                  return (
                    <div
                      key={point.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-base font-medium text-white">{point.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{point.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/70">Ürün kapsamı</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.35rem]">
                  Kullanıcı uygulamanın tüm yeteneklerini düzenli bir yapıda hemen görsün.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                Ürün; denetim ekranları, OSGB operasyon modülü, planlama araçları ve belge katmanı ile birlikte
                konumlanır. Ziyaretçi tek bakışta “bu sistem operasyonumu toplar” sonucuna varmalıdır.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {moduleGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div
                    key={group.title}
                    className={`rounded-[28px] border p-6 ${group.tone}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Modül grubu</p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                          {group.title}
                        </h3>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {group.items.map((item) => (
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
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(8,18,30,0.92),rgba(10,16,26,0.88))] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Öne çıkan alanlar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Ürünün güçlü görünen ekranları
              </h2>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {footerModules.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-lg font-medium text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Satın alma mesajı</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                    Bu sistem neyi çözüyor?
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
                  <p className="text-sm leading-7 text-slate-200">
                    Denetron; denetim, belge, görev, OSGB portföyü ve planlama süreçlerini ayrı araçlar yerine
                    tek operasyon mimarisinde birleştirir.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
                  <p className="text-sm leading-7 text-slate-200">
                    Kullanıcı daha düzenli ekranlar görür, ekip daha az manuel takip yapar, yönetici ise
                    önceliği yüksek konuları gecikmeden fark eder.
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-5">
                  <p className="text-sm leading-7 text-emerald-50/90">
                    Doğru konumlama cümlesi: “İSG operasyonunu görünür, hızlı ve yönetilebilir hâle getiren
                    birleşik çalışma sistemi.”
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => navigate("/auth")}
                >
                  Uygulamayı aç
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/osgb/dashboard")}
                >
                  OSGB panelini gör
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
