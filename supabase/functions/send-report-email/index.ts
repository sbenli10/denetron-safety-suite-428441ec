// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReportEmailRequest {
  recipient_email: string;
  recipient_name: string;
  company_name: string;
  report_type: "risk_assessment" | "dof" | "adep" | "inspection";
  report_url: string;
  report_filename: string;
  sender_name: string;
  sender_email: string;
  custom_message?: string;
  org_id: string;
  user_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: SendReportEmailRequest = await req.json();

    if (!payload.recipient_email || !payload.report_url) {
      throw new Error("Recipient email and report URL are required");
    }

    const reportTypeLabels = {
      risk_assessment: "Risk Değerlendirme Raporu",
      dof: "DÖF (Düzeltici/Önleyici Faaliyet) Raporu",
      adep: "Acil Durum Eylem Planı",
      inspection: "Denetim Raporu",
    };

    const emailSubject = `${reportTypeLabels[payload.report_type]} - ${payload.company_name}`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content p { color: #374151; line-height: 1.6; margin: 10px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .report-info { background: #f3f4f6; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Denetron İSG Raporu</h1>
    </div>
    <div class="content">
      <p>Sayın <strong>${payload.recipient_name || "Yetkili"}</strong>,</p>
      
      <p>${payload.sender_name} tarafından hazırlanan <strong>${reportTypeLabels[payload.report_type]}</strong> tarafınıza iletilmiştir.</p>
      
      <div class="report-info">
        <p style="margin: 5px 0;"><strong>📄 Rapor Türü:</strong> ${reportTypeLabels[payload.report_type]}</p>
        <p style="margin: 5px 0;"><strong>🏢 Firma:</strong> ${payload.company_name}</p>
        <p style="margin: 5px 0;"><strong>📅 Gönderim Tarihi:</strong> ${new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        <p style="margin: 5px 0;"><strong>👤 Gönderen:</strong> ${payload.sender_name} (${payload.sender_email})</p>
      </div>

      ${payload.custom_message ? `<p style="font-style: italic; color: #6b7280;">"${payload.custom_message}"</p>` : ""}

      <p style="text-align: center;">
        <a href="${payload.report_url}" class="button" style="color: white;">📥 Raporu İndir</a>
      </p>

      <p style="font-size: 14px; color: #6b7280;">Raporu indirerek detaylı inceleyin. Sorularınız için gönderen kişi ile iletişime geçebilirsiniz.</p>
    </div>
    <div class="footer">
      <p>Bu e-posta <strong>Denetron İSG Yazılımı</strong> tarafından otomatik olarak gönderilmiştir.</p>
      <p>© ${new Date().getFullYear()} Denetron. Tüm hakları saklıdır.</p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Denetron İSG <${payload.sender_email || "noreply@denetron.me"}>`,
        to: [payload.recipient_email],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await response.json();

    await supabase.from("email_logs").insert({
      org_id: payload.org_id,
      user_id: payload.user_id,
      recipient_email: payload.recipient_email,
      subject: emailSubject,
      report_type: payload.report_type,
      report_url: payload.report_url,
      status: "sent",
      email_id: emailResult.id,
    });

    return new Response(JSON.stringify({ success: true, email_id: emailResult.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});