import {
  ArrowRight,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    title: "Saha akışı",
    text: "Denetimler, uygunsuzluklar ve rapor süreci tek iş akışında ilerler.",
    icon: ShieldAlert,
  },
  {
    title: "OSGB operasyonu",
    text: "Personel, atama, kapasite ve şirket takibi aynı panel üzerinde birleşir.",
    icon: Briefcase,
  },
  {
    title: "Belge katmanı",
    text: "Atama yazıları, planlar ve doküman takibi dağınık yapıdan çıkar.",
    icon: FileCheck2,
  },
];

const modules = [
  "Yönetici dashboard",
  "Yapay zekâ destekli İSG Bot",
  "OSGB modülü ve görevlendirme",
  "Denetim, DÖF ve olay yönetimi",
  "Belge, plan ve rapor üretimi",
  "Görev, uyarı ve finans takibi",
];

const benefits = [
  "Kritik risk ve geciken iş baskısı anında görünür.",
  "Kullanıcı ilk ekranda neye odaklanması gerektiğini anlar.",
  "Müşteriye daha profesyonel ve daha hızlı hizmet verilir.",
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f1a] text-white">
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_18%,rgba(251,191,36,0.13),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.10),transparent_26%),linear-gradient(180deg,#090d16_0%,#0d1422_52%,#0b111d_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:120px_120px]" />

      <div className="mx-auto flex min-h-screen max-w-[1420px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">DENETRON</p>
              <p className="text-xs text-slate-400">İSG operasyon sistemi</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
              Yapay zekâ destekli
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
              Dashboard + OSGB + Belge + Plan
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
              className="gap-2 bg-amber-300 text-slate-950 hover:bg-amber-200"
              onClick={() => navigate("/auth")}
            >
              Panele geç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 py-10">
          <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(155deg,rgba(14,20,31,0.96),rgba(9,14,24,0.90))] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sky-100">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Yapay zekâ ile hızlanan operasyon
                </Badge>
              </div>

              <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.36em] text-slate-400">
                    New generation safety control
                  </p>
                  <h1 className="max-w-3xl text-[3rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[4rem] xl:text-[4.85rem]">
                    İş güvenliği operasyonunu sadeleştiren,
                    <span className="block bg-gradient-to-r from-amber-200 via-white to-sky-300 bg-clip-text text-transparent">
                      daha akıllı bir çalışma sistemi.
                    </span>
                  </h1>
                  <p className="max-w-2xl text-[15px] leading-8 text-slate-300 sm:text-base">
                    Denetron; risk analizi, OSGB yönetimi, görev takibi ve dokümantasyon süreçlerini
                    aynı kurumsal omurgada toplar. Yapay zekâ destekli katman, hız kazandırırken
                    yöneticiye gerçek öncelikleri daha net gösterir.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      className="h-14 gap-2 rounded-2xl bg-amber-300 px-7 text-base font-medium text-slate-950 hover:bg-amber-200"
                      onClick={() => navigate("/auth")}
                    >
                      Uygulamayı aç
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-7 text-base text-slate-100 hover:bg-white/10"
                      onClick={() => navigate("/osgb")}
                    >
                      OSGB modülünü incele
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Bu ürün ne yapar?</p>
                  <div className="mt-5 space-y-3">
                    {benefits.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-[#101726] p-4"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <p className="text-sm leading-6 text-slate-200">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,19,31,0.96),rgba(11,16,26,0.98))] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.32)]">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_58%)]" />

              <div className="relative flex items-center justify-between border-b border-white/6 pb-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">control canvas</p>
                  <p className="text-sm text-slate-300">Yönetici görünümü</p>
                </div>
                <Badge className="border-emerald-400/15 bg-emerald-500/10 text-emerald-200">
                  Sistem aktif
                </Badge>
              </div>

              <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-sky-400/12 bg-[#0d1525] p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                          Yapay zekâ komut katmanı
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          İSG Bot aktif öneriler, analiz ve hızlı aksiyon üretimi sağlıyor.
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                        <Bot className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk taraması</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">24</p>
                        <p className="mt-1 text-sm text-slate-300">Tespit edilen aktif başlık</p>
                      </div>
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Analiz tamamlama</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">100%</p>
                        <p className="mt-1 text-sm text-slate-300">Hazır öneri ve çıktı oranı</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-white/8 bg-[#10182a] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Canlı</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-[#10182a] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                        <Workflow className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">Görev akışı</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Düzenli</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-[#10182a] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                        <Gauge className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">Hız modeli</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Cache-first</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/8 bg-[#10182a] p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                      Operasyon özeti
                    </p>
                    <div className="mt-5 space-y-3">
                      {modules.map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-xs font-semibold text-slate-300">
                              {index + 1}
                            </div>
                            <span className="text-sm text-slate-200">{item}</span>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-amber-300/12 bg-amber-300/[0.07] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/12 text-amber-100">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">Uyarı merkezi hazır</p>
                        <p className="text-sm text-slate-300">
                          Yaklaşan sözleşme, açık iş ve kritik risk baskısı tek yerde toplanır.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/8 bg-[#10182a] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Aktif kullanıcı</p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">2460+</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-[#10182a] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Oluşturulan rapor</p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">50K+</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xl font-medium text-white">{pillar.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{pillar.text}</p>
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}
