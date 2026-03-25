import { ArrowRight, BadgeCheck, BellRing, Briefcase, FileCheck, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const valueCards = [
  {
    title: "Operasyonu tek ekranda yönet",
    description: "Denetim, DÖF, OSGB portföyü ve belge yenileme baskısını tek operasyon katmanında topla.",
    icon: Briefcase,
  },
  {
    title: "Gecikmeyi görünür hale getir",
    description: "Yaklaşan sözleşmeler, kritik riskler ve açık aksiyonlar yöneticinin önüne öncelik sırasıyla gelsin.",
    icon: BellRing,
  },
  {
    title: "Belge ve yük takibini standartlaştır",
    description: "Atama, evrak, finans ve saha denetimi aynı veri modeliyle ilerlesin; ayrı Excel döngüsü kalmasın.",
    icon: FileCheck,
  },
];

const workflow = [
  "Girişten sonra aktif iş yükü, geciken aksiyon ve kritik risk kartları anında görünür.",
  "Kritik liste ekranları cache-first davranır; son bilinen veri hemen açılır, taze veri arka planda yenilenir.",
  "OSGB tarafında personel, kapasite, finans ve görev modülleri operasyon kararına dönük özetlerle açılır.",
];

const proofPoints = [
  "Risk ve denetim verisini yönetim diline çeviren dashboard",
  "OSGB portföyü için kapasite, uyarı, finans ve görev katmanı",
  "Belge, atama ve saha kayıtlarını tek akışta birleştiren çalışma ekranları",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium tracking-wide text-cyan-100">Denetron</p>
              <p className="text-xs text-slate-400">ISG operasyon platformu</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-slate-200 hover:bg-white/10" onClick={() => navigate("/auth")}>
              Giris yap
            </Button>
            <Button className="gap-2" onClick={() => navigate("/auth")}>
              Panele gec
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-14">
          <section className="grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-cyan-400/20 bg-cyan-500/10 text-cyan-100">Operasyon odakli</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">Cache-first hiz modeli</Badge>
              </div>

              <div className="space-y-5">
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/70">Safety operations system</p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-6xl">
                  Denetim, gorev ve OSGB portfoyunu tek kontrol masasinda yonetin.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300">
                  Denetron, saha verisini sadece kaydetmez. Geciken aksiyonlari, kritik riskleri, kapasite aciklarini ve
                  belge baskisini yoneticiye bugun neye bakmasi gerektigini soyleyen bir operasyon ekranina donusturur.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {valueCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    Operasyon vaatleri
                  </div>
                  <CardTitle className="text-3xl leading-tight">Excel zinciri yerine tek is akisina gecin.</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proofPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-slate-300">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-cyan-400/10 bg-cyan-500/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Zap className="h-5 w-5 text-cyan-200" />
                    Uygulama nasil hissedilmeli?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workflow.map((item, index) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-xs font-semibold text-cyan-100">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-200">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
