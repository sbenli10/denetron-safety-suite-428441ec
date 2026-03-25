import {
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const coreModules = [
  "Risk analizi ve denetim akışları",
  "OSGB yönetimi ve görevlendirme",
  "Görev, evrak ve finans takibi",
  "Belge, plan ve rapor üretimi",
];

const featureCards = [
  {
    title: "Yönetici paneli",
    description: "Kritik riskler, geciken işler ve operasyon yoğunluğu tek görünümde toplanır.",
    icon: LayoutDashboard,
  },
  {
    title: "OSGB modülü",
    description: "Personel, atama, kapasite, şirket ve evrak takibi tek sistem üzerinden yürür.",
    icon: Briefcase,
  },
  {
    title: "Yapay zeka desteği",
    description: "İSG Bot ve akıllı akışlar analiz, öneri ve hız kazandıran yardımcı katman sunar.",
    icon: Bot,
  },
];

const trustItems = [
  "Daha düzenli operasyon görünümü",
  "Tek merkezden çalışan modüller",
  "Daha hızlı ve profesyonel müşteri deneyimi",
];

const statCards = [
  { label: "Aktif kullanıcı", value: "2460+" },
  { label: "Oluşturulan rapor", value: "50K+" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071327] text-white">
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,#081225_0%,#0a1730_55%,#091120_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">DENETRON</p>
              <p className="text-xs text-slate-400">İSG operasyon platformu</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-blue-400/20 bg-blue-400/10 text-blue-100">
              Yapay zekâ destekli platform
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
              className="gap-2 bg-blue-500 text-white hover:bg-blue-400"
              onClick={() => navigate("/auth")}
            >
              Panele git
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 py-10">
          <section className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-blue-100">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Yapay zekâ destekli yeni nesil platform
                </Badge>
              </div>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-[3.2rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[4.4rem] xl:text-[5.35rem]">
                  İş güvenliğini
                  <span className="mt-2 block bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                    kolaylaştırıyoruz.
                  </span>
                </h1>

                <p className="max-w-2xl text-lg leading-9 text-slate-300">
                  Denetron; İSG Bot ve yapay zekâ destekli akışlarla risk analizi, OSGB yönetimi,
                  görev takibi ve dokümantasyon süreçlerini tek merkezde birleştirir.
                  Daha hızlı, daha düzenli ve daha profesyonel bir çalışma düzeni sunar.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 min-w-[190px] gap-2 rounded-2xl bg-blue-500 px-7 text-base font-medium text-white hover:bg-blue-400"
                  onClick={() => navigate("/auth")}
                >
                  Panele git
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

              <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex gap-1 text-blue-300">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>
                  <span>4.9/5 kullanıcı memnuniyeti</span>
                </div>
                <div className="hidden h-5 w-px bg-white/10 sm:block" />
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  KVKK ve kurumsal güvenlik yaklaşımı
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 -top-6 z-20 rounded-[24px] border border-white/10 bg-[#10192c] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Aktif kullanıcı
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">2460+</p>
              </div>

              <div className="absolute -bottom-4 right-2 z-20 rounded-[24px] border border-white/10 bg-[#10192c] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Oluşturulan rapor
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">50K+</p>
              </div>

              <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,41,0.94),rgba(12,19,34,0.98))] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between border-b border-white/6 pb-5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400/90" />
                    <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    isg-command-center
                  </div>
                  <Badge className="border-blue-400/15 bg-blue-500/10 text-blue-100">
                    Canlı sistem izleme
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-cyan-400/12 bg-[#0d182a] p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                            Risk analiz durumu
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            Yapay zekâ modelleri aktif tarama yapıyor
                          </p>
                        </div>
                        <Badge className="border-emerald-400/15 bg-emerald-500/10 text-emerald-200">
                          Aktif
                        </Badge>
                      </div>
                      <div className="mt-6 h-44 rounded-[22px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-[24px] border border-white/8 bg-[#111a2e] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                          Tespit edilen risk
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">24</p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-[#111a2e] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                          <Zap className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                          Analiz tamamlandı
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">100%</p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-[#111a2e] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                          <Gauge className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                          Genel görünüm
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">5K+</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/8 bg-[#111a2e] p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Sistem logları
                      </p>
                      <div className="mt-5 space-y-3">
                        <div className="rounded-[18px] bg-white/[0.03] p-4">
                          <p className="text-xs text-slate-500">10:42</p>
                          <p className="mt-2 text-sm text-slate-200">TR raporu PDF dokümanına dönüştürüldü</p>
                        </div>
                        <div className="rounded-[18px] bg-white/[0.03] p-4">
                          <p className="text-xs text-slate-500">10:42</p>
                          <p className="mt-2 text-sm text-slate-200">Eğitim: 12 çalışan eğitimi tamamlandı</p>
                        </div>
                        <div className="rounded-[18px] bg-white/[0.03] p-4">
                          <p className="text-xs text-slate-500">10:43</p>
                          <p className="mt-2 text-sm text-slate-200">İSG Bot risk analizi önerisi oluşturdu</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-blue-400/10 bg-blue-500/10 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">İSG Bot hazır</p>
                          <p className="text-sm text-slate-300">
                            Analizleri tek tıkla rapora dönüştürür.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xl font-medium text-white">{card.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">Ürün kapsamı</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Tüm temel modüller tek bakışta anlaşılır olsun.
              </h2>
              <div className="mt-7 grid gap-3">
                {coreModules.map((module) => (
                  <div
                    key={module}
                    className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-[#0d1729] p-4"
                  >
                    <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <p className="text-sm leading-6 text-slate-200">{module}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">Neden satın alınır?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                Düzenli ekranlar, hızlı his ve profesyonel görünüm.
              </h2>
              <div className="mt-7 space-y-3">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-[#0d1729] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm leading-6 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-white/10 bg-[#0d1729] p-5"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
