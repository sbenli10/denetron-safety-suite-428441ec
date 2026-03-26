import {
  ArrowRight,
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
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
];

const moduleNodes = [
  {
    title: "Yönetici Paneli",
    subtitle: "Kritik görünüm",
    icon: LayoutDashboard,
    className: "left-[8%] top-[14%]",
    glow: "from-cyan-400/25 to-sky-500/10",
  },
  {
    title: "Denetimler",
    subtitle: "Saha akışı",
    icon: ClipboardCheck,
    className: "left-[6%] top-[56%]",
    glow: "from-emerald-400/20 to-cyan-500/10",
  },
  {
    title: "İSG Bot",
    subtitle: "Akıllı destek",
    icon: Bot,
    className: "left-[37%] top-[4%]",
    glow: "from-fuchsia-400/20 to-violet-500/10",
  },
  {
    title: "OSGB Modülü",
    subtitle: "Operasyon merkezi",
    icon: Users,
    className: "left-[36%] top-[62%]",
    glow: "from-amber-300/20 to-orange-500/10",
  },
  {
    title: "Belge Yönetimi",
    subtitle: "Plan ve evrak",
    icon: FileCheck2,
    className: "right-[9%] top-[18%]",
    glow: "from-slate-100/10 to-cyan-500/10",
  },
  {
    title: "Bildirimler",
    subtitle: "Yaklaşan işlemler",
    icon: BellRing,
    className: "right-[6%] top-[58%]",
    glow: "from-rose-300/20 to-amber-400/10",
  },
];

const moduleSummary = [
  "Risk analizi ve denetim yönetimi",
  "Görev, aksiyon ve bildirim takibi",
  "Doküman, plan ve rapor üretimi",
  "Çalışan, firma ve OSGB operasyon modülleri",
];

const workFlowSteps = [
  {
    step: "01",
    title: "Firma ve çalışan verilerini yönetin",
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
  {
    problem: "Dağınık evrak takibi",
    solution: "Belge ve plan süreçleri tek yapıda toplanır.",
  },
  {
    problem: "Manuel kontrol süreçleri",
    solution: "Görev, bildirim ve operasyon akışları merkezi hale gelir.",
  },
  {
    problem: "Geciken aksiyonlar",
    solution: "Açık işler ve kritik başlıklar yönetici ekranında görünür olur.",
  },
  {
    problem: "Denetim hazırlığında eksikler",
    solution: "Denetim, uygunsuzluk ve belge akışı tek omurgada yürür.",
  },
  {
    problem: "Çalışan ve firma bazlı takip zorluğu",
    solution: "Firma, çalışan ve OSGB modülleri birbiriyle bağlantılı çalışır.",
  },
];

const trustMetrics = [
  { label: "Aktif kullanıcı alanı", value: "2460+" },
  { label: "Oluşturulan kayıtlar", value: "50K+" },
  { label: "Yönetilen süreç alanı", value: "12+" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f1d] text-white">
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
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
        @keyframes landingBeam {
          0%, 100% { opacity: 0.18; transform: scaleX(0.98); }
          50% { opacity: 0.48; transform: scaleX(1.02); }
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
      `}</style>

      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_16%,rgba(12,24,48,0.95),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(17,24,39,0.9),transparent_28%),radial-gradient(circle_at_58%_70%,rgba(34,211,238,0.08),transparent_22%),linear-gradient(180deg,#090d17_0%,#0b1220_55%,#0a101b_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.65)_1px,transparent_1px)] [background-size:108px_108px]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_28%)]" />

      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="landing-fade-up flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-100">İSGVİZYON</p>
              <p className="text-xs text-slate-400">Yeni nesil İSG yönetim sistemi</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
              Yapay zekâ destekli
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
              Kurumsal ve profesyonel kullanım
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-slate-200 hover:bg-white/10"
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

        <main className="flex flex-1 flex-col gap-12 py-10 lg:py-12">
          <section className="landing-fade-up grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center" style={{ animationDelay: "0.12s" }}>
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-cyan-100">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Akıllı ve profesyonel İSG platformu
                </Badge>
              </div>

              <div className="space-y-6">
                <h1 className="max-w-4xl text-[3.2rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[4.35rem] xl:text-[5.35rem]">
                  İSGVİZYON
                </h1>
                <p className="max-w-4xl text-[1.6rem] font-medium leading-tight tracking-[-0.035em] text-slate-100 sm:text-[2rem] xl:text-[2.4rem]">
                  İSG süreçlerinizi dijitalleştirin, yönetin ve denetimlere her zaman hazır olun.
                </p>
                <p className="max-w-2xl text-[15px] leading-8 text-slate-300 sm:text-base">
                  İSGVİZYON; manuel evrak yükünü, dağınık takip süreçlerini ve denetim hazırlığındaki belirsizliği
                  ortadan kaldırmak için tasarlandı. Daha hızlı, daha düzenli ve daha profesyonel bir yönetim deneyimi sunar.
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

            <div className="landing-fade-up rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,33,0.96),rgba(10,16,28,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]" style={{ animationDelay: "0.18s" }}>
              <div className="flex items-center justify-between border-b border-white/6 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Canlı sistem ağı</p>
                  <p className="mt-1 text-sm text-slate-300">Modüller tek omurgada çalışır</p>
                </div>
                <Badge className="border-emerald-400/15 bg-emerald-500/10 text-emerald-200">
                  Sistem aktif
                </Badge>
              </div>

              <div className="relative mt-6 h-[520px] overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.75),rgba(9,13,23,0.96))]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_34%),radial-gradient(circle_at_55%_45%,rgba(139,92,246,0.08),transparent_30%)]" />

                <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10 landing-pulse" />
                <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/10 landing-pulse" style={{ animationDelay: "1.4s" }} />

                <div className="absolute left-1/2 top-1/2 h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-4 text-center shadow-[0_0_80px_rgba(34,211,238,0.12)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">İSG Bot</p>
                  <p className="mt-1 text-xs text-slate-300">Akıllı koordinasyon</p>
                </div>

                <div className="absolute left-[26%] top-[22%] h-px w-[24%] rotate-[18deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent landing-beam" />
                <div className="absolute left-[26%] top-[62%] h-px w-[24%] -rotate-[16deg] bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent landing-beam" style={{ animationDelay: "1s" }} />
                <div className="absolute right-[25%] top-[24%] h-px w-[24%] -rotate-[18deg] bg-gradient-to-r from-transparent via-fuchsia-300/45 to-transparent landing-beam" style={{ animationDelay: "2s" }} />
                <div className="absolute right-[24%] top-[62%] h-px w-[24%] rotate-[14deg] bg-gradient-to-r from-transparent via-amber-300/45 to-transparent landing-beam" style={{ animationDelay: "1.6s" }} />
                <div className="absolute left-[42%] top-[18%] h-[16%] w-px bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent landing-beam" style={{ animationDelay: "0.8s" }} />
                <div className="absolute left-[57%] top-[66%] h-[15%] w-px bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent landing-beam" style={{ animationDelay: "1.8s" }} />

                {moduleNodes.map((node, index) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.title}
                      className={`landing-float absolute ${node.className} w-[182px] rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-400/20`}
                      style={{ animationDelay: `${index * 0.7}s` }}
                    >
                      <div className={`absolute inset-0 rounded-[24px] bg-gradient-to-br ${node.glow} opacity-60`} />
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
            </div>
          </section>

          <section className="landing-fade-up grid gap-5 md:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: "0.28s" }}>
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
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="landing-fade-up rounded-[32px] border border-white/10 bg-white/[0.04] p-7" style={{ animationDelay: "0.34s" }}>
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
            </div>

            <div className="landing-fade-up rounded-[32px] border border-white/10 bg-white/[0.04] p-7" style={{ animationDelay: "0.4s" }}>
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
            </div>
          </section>

          <section className="landing-fade-up rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.82),rgba(15,23,42,0.94))] p-7" style={{ animationDelay: "0.46s" }}>
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
                {trustMetrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-center transition-transform duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${0.52 + index * 0.05}s` }}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                    <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">{metric.value}</p>
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
