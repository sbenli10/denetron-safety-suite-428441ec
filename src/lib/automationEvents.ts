import { supabase } from "@/integrations/supabase/client";

export type AutomationEventInput = {
  eventName: string;
  organizationId?: string | null;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  source?: string;
  payload?: Record<string, unknown>;
};

export async function createAutomationEvent({
  eventName,
  organizationId = null,
  userId = null,
  entityType,
  entityId = null,
  source = "app",
  payload = {},
}: AutomationEventInput) {
  const eventPayload = {
    event_name: eventName,
    organization_id: organizationId,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    source,
    payload,
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
    return await createAutomationEvent(input);
  } catch (error) {
    console.warn(`Automation event could not be recorded for ${input.eventName}:`, error);
    return null;
  }
}
