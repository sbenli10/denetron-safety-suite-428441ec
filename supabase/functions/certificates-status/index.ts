import { corsHeaders, createServiceClient, jsonResponse, requireAuthUser } from "../_shared/certificate-utils.ts";

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAuthUser(req);
    const url = new URL(req.url);
    const certificateId = normalizeText(url.searchParams.get("certificateId"));
    if (!certificateId) {
      return jsonResponse({ error: "certificateId is required" }, 400);
    }

    const supabase = createServiceClient();
    const { data: certificate, error: certificateError } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", certificateId)
      .maybeSingle();
    if (certificateError) throw certificateError;
    if (!certificate) {
      return jsonResponse({ error: "Certificate not found" }, 404);
    }

    const { data: job, error: jobError } = await supabase
      .from("certificate_jobs")
      .select("*")
      .eq("certificate_id", certificateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jobError) throw jobError;

    if (!job) {
      return jsonResponse({
        certificate,
        job: {
          id: null,
          certificate_id: certificateId,
          status: "draft",
          progress: 0,
          total_files: 0,
          completed_files: 0,
          zip_path: null,
          error_message: null,
        },
        items: [],
      });
    }

    const { data: items, error: itemError } = await supabase
      .from("certificate_job_items")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    if (itemError) throw itemError;

    return jsonResponse({ certificate, job, items: items || [] });
  } catch (error) {
    console.error("certificates-status failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
