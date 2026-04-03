import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AutomationEventRow = {
  id: string;
  event_name: string;
  organization_id: string | null;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  source: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  attempt_count: number | null;
  created_at: string;
  processed_at: string | null;
  last_error: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing Supabase env vars" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!webhookUrl || !webhookSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing n8n env vars" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit =
      typeof body?.limit === "number" && body.limit > 0 && body.limit <= 100
        ? body.limit
        : 20;

    const { data: events, error: fetchError } = await supabase
      .from("automation_events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      throw fetchError;
    }

    const pendingEvents = (events ?? []) as AutomationEventRow[];

    if (!pendingEvents.length) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, message: "No pending events" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: Array<{
      event_id: string;
      status: "processed" | "failed";
      response_code?: number;
      error?: string;
    }> = [];

    for (const event of pendingEvents) {
      try {
        const payload = {
          event_id: event.id,
          event_name: event.event_name,
          occurred_at: event.created_at,
          organization_id: event.organization_id,
          user_id: event.user_id,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          source: event.source ?? "app",
          payload: event.payload ?? {},
        };

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-denetron-secret": webhookSecret,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();

        await supabase.from("automation_deliveries").insert({
          event_id: event.id,
          provider: "n8n",
          delivery_status: response.ok ? "processed" : "failed",
          response_code: response.status,
          response_body: responseText,
        });

        await supabase
          .from("automation_events")
          .update({
            status: response.ok ? "processed" : "failed",
            attempt_count: (event.attempt_count ?? 0) + 1,
            processed_at: response.ok ? new Date().toISOString() : null,
            last_error: response.ok ? null : `Webhook returned ${response.status}: ${responseText}`,
          })
          .eq("id", event.id);

        results.push({
          event_id: event.id,
          status: response.ok ? "processed" : "failed",
          response_code: response.status,
          error: response.ok ? undefined : responseText,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown dispatch error";

        await supabase.from("automation_deliveries").insert({
          event_id: event.id,
          provider: "n8n",
          delivery_status: "failed",
          response_code: 0,
          response_body: message,
        });

        await supabase
          .from("automation_events")
          .update({
            status: "failed",
            attempt_count: (event.attempt_count ?? 0) + 1,
            last_error: message,
          })
          .eq("id", event.id);

        results.push({
          event_id: event.id,
          status: "failed",
          error: message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: results.filter((r) => r.status === "processed").length,
        failed: results.filter((r) => r.status === "failed").length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown function error";

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
