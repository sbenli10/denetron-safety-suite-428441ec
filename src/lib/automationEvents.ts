import { supabase } from "@/integrations/supabase/client";

export type AutomationEventInput = {
  eventName: string;
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  entityType: string;
  entityId?: string | null;
  source?: string;
  payload?: Record<string, unknown>;
};

export async function createAutomationEvent({
  eventName,
  organizationId = null,
  userId = null,
  userEmail = null,
  entityType,
  entityId = null,
  source = "app",
  payload = {},
}: AutomationEventInput) {
  const normalizedPayload = userEmail
    ? {
        ...payload,
        created_by_email: payload.created_by_email ?? userEmail,
      }
    : payload;

  const eventPayload = {
    event_name: eventName,
    organization_id: organizationId,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    source,
    payload: normalizedPayload,
  };

  const { data, error } = await (supabase as any)
    .from("automation_events")
    .insert(eventPayload)
    .select("id, status, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    status: string;
    created_at: string;
  };
}

export async function createAutomationEventSafe(input: AutomationEventInput) {
  try {
    const event = await createAutomationEvent(input);

    // Trigger dispatch in the background so queued automation events are delivered
    // without requiring a manual PowerShell call or cron-only flow.
    supabase.functions
      .invoke("dispatch-automation-event", {
        body: { limit: 20 },
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Automation dispatch trigger failed:", error);
        }
      })
      .catch((error) => {
        console.warn("Automation dispatch trigger failed:", error);
      });

    return event;
  } catch (error) {
    console.warn(`Automation event could not be recorded for ${input.eventName}:`, error);
    return null;
  }
}
