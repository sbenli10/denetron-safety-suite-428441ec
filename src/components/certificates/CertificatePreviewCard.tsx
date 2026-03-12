import { Award, CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CertificateFormValues, CertificateParticipantInput } from "@/types/certificates";

type Props = {
  form: CertificateFormValues;
  participant?: CertificateParticipantInput | null;
  className?: string;
};

const themeMap = {
  classic: {
    shell: "border-[10px] border-amber-300 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,235,205,0.95))] text-slate-900 shadow-[0_30px_80px_rgba(120,87,26,0.22)]",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    line: "from-amber-500 via-yellow-300 to-amber-500",
  },
  modern: {
    shell: "border border-cyan-400/40 bg-[linear-gradient(135deg,#0f172a_0%,#111827_40%,#14213d_100%)] text-white shadow-[0_30px_80px_rgba(34,211,238,0.18)]",
    badge: "bg-cyan-500/10 text-cyan-100 border-cyan-300/30",
    line: "from-cyan-400 via-sky-300 to-indigo-400",
  },
  minimal: {
    shell: "border border-slate-300 bg-white text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    line: "from-slate-800 via-slate-400 to-slate-800",
  },
} as const;

export function CertificatePreviewCard({ form, participant, className }: Props) {
  const theme = themeMap[form.template_type || "classic"];

  return (
    <div className={cn("relative overflow-hidden rounded-[28px] p-8 md:p-10", theme.shell, className)}>
      <div className="absolute inset-x-10 top-6 h-px bg-gradient-to-r opacity-70" style={{ backgroundImage: `linear-gradient(to right, transparent, currentColor, transparent)` }} />
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]", theme.badge)}>
              <Award className="h-3.5 w-3.5" />
              {form.certificate_type || "Katılım"}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.45em] opacity-70">Kurumsal Eğitim Sertifikası</p>
            <h3 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{participant?.name || "Katılımcı Adı"}</h3>
            <p className="mt-4 max-w-3xl text-sm leading-7 opacity-80 md:text-base">
              {form.company_name || "Firma Adı"} tarafından düzenlenen <strong>{form.training_name || "Eğitim Adı"}</strong> programını başarıyla tamamlamıştır.
            </p>
          </div>
          <div className="min-w-[180px] rounded-2xl border border-white/10 bg-black/5 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] opacity-60">Eğitmenler</p>
            <p className="mt-3 text-sm font-medium leading-6">{form.trainer_names.filter(Boolean).join(", ") || "Tanımlanmadı"}</p>
          </div>
        </div>

        <div className={cn("h-1 w-full rounded-full bg-gradient-to-r", theme.line)} />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-current/10 bg-black/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] opacity-60"><CalendarDays className="h-4 w-4" /> Tarih</div>
            <p className="mt-3 text-base font-semibold">{form.training_date || "-"}</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-black/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] opacity-60"><Clock3 className="h-4 w-4" /> Süre</div>
            <p className="mt-3 text-base font-semibold">{form.training_duration || "-"}</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-black/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] opacity-60"><ShieldCheck className="h-4 w-4" /> Geçerlilik</div>
            <p className="mt-3 text-base font-semibold">{form.validity_date || "Süresiz"}</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-black/5 p-4">
            <div className="text-xs uppercase tracking-[0.25em] opacity-60">Görev</div>
            <p className="mt-3 text-base font-semibold">{participant?.job_title || "Belirtilmedi"}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-current/10 bg-black/5 p-5">
            <p className="text-xs uppercase tracking-[0.28em] opacity-60">Firma Bilgileri</p>
            <p className="mt-4 text-lg font-semibold">{form.company_name || "Firma adı girilmedi"}</p>
            <p className="mt-2 text-sm leading-6 opacity-75">{form.company_address || "Adres girilmedi"}</p>
            <p className="mt-2 text-sm opacity-75">{form.company_phone || "Telefon girilmedi"}</p>
          </div>
          <div className="flex items-end justify-between gap-6 rounded-2xl border border-current/10 bg-black/5 p-5">
            <div className="flex-1">
              <div className="h-px w-full bg-current/25" />
              <p className="mt-3 text-xs uppercase tracking-[0.24em] opacity-65">Eğitmen İmzası</p>
            </div>
            <div className="flex-1">
              <div className="h-px w-full bg-current/25" />
              <p className="mt-3 text-xs uppercase tracking-[0.24em] opacity-65">Firma Yetkilisi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
