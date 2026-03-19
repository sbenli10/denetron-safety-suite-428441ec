import { supabase } from "@/integrations/supabase/client";

export interface OsgbCompanyOption {
  id: string;
  companyName: string;
  hazardClass: string;
  contractEnd: string | null;
}

export interface OsgbFinanceRecord {
  id: string;
  user_id: string;
  company_id: string;
  invoice_no: string | null;
  service_period: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_at: string | null;
  payment_note: string | null;
  created_at: string;
  company?: { company_name: string | null } | null;
}

export interface OsgbDocumentRecord {
  id: string;
  user_id: string;
  company_id: string;
  document_type: string;
  document_name: string;
  issue_date: string | null;
  expiry_date: string | null;
  status: "active" | "warning" | "expired" | "archived";
  file_url: string | null;
  notes: string | null;
  created_at: string;
  company?: { company_name: string | null } | null;
}

export interface OsgbTaskRecord {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "completed" | "cancelled";
  assigned_to: string | null;
  due_date: string | null;
  source: string;
  created_at: string;
  company?: { company_name: string | null } | null;
}

export interface OsgbNoteRecord {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string | null;
  note: string;
  note_type: "general" | "finance" | "document" | "assignment" | "risk";
  created_at: string;
  updated_at: string;
  company?: { company_name: string | null } | null;
}

export interface OsgbTaskInput {
  companyId?: string | null;
  relatedDocumentId?: string | null;
  relatedFinanceId?: string | null;
  title: string;
  description?: string | null;
  priority?: OsgbTaskRecord["priority"];
  status?: OsgbTaskRecord["status"];
  assignedTo?: string | null;
  dueDate?: string | null;
  source?: string;
}

export interface OsgbFinanceInput {
  companyId: string;
  invoiceNo?: string | null;
  servicePeriod?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  amount: number;
  currency?: string;
  status?: OsgbFinanceRecord["status"];
  paidAt?: string | null;
  paymentNote?: string | null;
}

export interface OsgbDocumentInput {
  companyId: string;
  documentType: string;
  documentName: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  status?: OsgbDocumentRecord["status"];
  fileUrl?: string | null;
  notes?: string | null;
}

export interface OsgbNoteInput {
  companyId?: string | null;
  title?: string | null;
  note: string;
  noteType?: OsgbNoteRecord["note_type"];
}

export interface OsgbFinanceCalendarItem {
  id: string;
  companyName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: OsgbFinanceRecord["status"];
  invoiceNo: string | null;
  servicePeriod: string | null;
  dayLabel: string;
  monthLabel: string;
  isOverdue: boolean;
}

export interface OsgbOperationalSummary {
  finance: {
    pendingCount: number;
    pendingAmount: number;
    paidAmount: number;
    overdueCount: number;
    overdueAmount: number;
    calendarItems: OsgbFinanceCalendarItem[];
    monthlyTrend: Array<{
      month: string;
      pendingAmount: number;
      paidAmount: number;
      overdueAmount: number;
    }>;
  };
  documents: {
    activeCount: number;
    warningCount: number;
    expiredCount: number;
    expiringSoonCount: number;
    monthlyTrend: Array<{
      month: string;
      activeCount: number;
      warningCount: number;
      expiredCount: number;
    }>;
  };
}

export const getOsgbCompanyOptions = async (userId: string): Promise<OsgbCompanyOption[]> => {
  const { data, error } = await supabase
    .from("isgkatip_companies")
    .select("id, company_name, hazard_class, contract_end")
    .eq("org_id", userId)
    .eq("is_deleted", false)
    .order("company_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    companyName: item.company_name,
    hazardClass: item.hazard_class || "Bilinmiyor",
    contractEnd: item.contract_end || null,
  }));
};

export const listOsgbFinance = async (userId: string): Promise<OsgbFinanceRecord[]> => {
  const { data, error } = await supabase
    .from("osgb_finance")
    .select("*, company:isgkatip_companies(company_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OsgbFinanceRecord[];
};

export const upsertOsgbFinance = async (userId: string, input: OsgbFinanceInput, id?: string) => {
  const payload = {
    user_id: userId,
    company_id: input.companyId,
    invoice_no: input.invoiceNo || null,
    service_period: input.servicePeriod || null,
    invoice_date: input.invoiceDate || null,
    due_date: input.dueDate || null,
    amount: input.amount,
    currency: input.currency || "TRY",
    status: input.status || "pending",
    paid_at: input.paidAt || null,
    payment_note: input.paymentNote || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase.from("osgb_finance").update(payload).eq("id", id).select("*, company:isgkatip_companies(company_name)").single();
    if (error) throw error;
    return data as OsgbFinanceRecord;
  }

  const { data, error } = await supabase.from("osgb_finance").insert(payload).select("*, company:isgkatip_companies(company_name)").single();
  if (error) throw error;
  return data as OsgbFinanceRecord;
};

export const deleteOsgbFinance = async (id: string) => {
  const { error } = await supabase.from("osgb_finance").delete().eq("id", id);
  if (error) throw error;
};

export const listOsgbDocuments = async (userId: string): Promise<OsgbDocumentRecord[]> => {
  const { data, error } = await supabase
    .from("osgb_document_tracking")
    .select("*, company:isgkatip_companies(company_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OsgbDocumentRecord[];
};

export const upsertOsgbDocument = async (userId: string, input: OsgbDocumentInput, id?: string) => {
  const payload = {
    user_id: userId,
    company_id: input.companyId,
    document_type: input.documentType,
    document_name: input.documentName,
    issue_date: input.issueDate || null,
    expiry_date: input.expiryDate || null,
    status: input.status || "active",
    file_url: input.fileUrl || null,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase.from("osgb_document_tracking").update(payload).eq("id", id).select("*, company:isgkatip_companies(company_name)").single();
    if (error) throw error;
    return data as OsgbDocumentRecord;
  }

  const { data, error } = await supabase.from("osgb_document_tracking").insert(payload).select("*, company:isgkatip_companies(company_name)").single();
  if (error) throw error;
  return data as OsgbDocumentRecord;
};

export const deleteOsgbDocument = async (id: string) => {
  const { error } = await supabase.from("osgb_document_tracking").delete().eq("id", id);
  if (error) throw error;
};

export const getOsgbOperationalSummary = async (userId: string): Promise<OsgbOperationalSummary> => {
  const [financeRows, documentRows] = await Promise.all([
    listOsgbFinance(userId),
    listOsgbDocuments(userId),
  ]);

  const now = new Date();
  const nextWindow = new Date();
  nextWindow.setDate(nextWindow.getDate() + 60);

  const calendarItems = financeRows
    .filter((record) => {
      if (!record.due_date) return false;
      const dueDate = new Date(record.due_date);
      if (Number.isNaN(dueDate.getTime())) return false;
      return record.status === "overdue" || (dueDate >= now && dueDate <= nextWindow);
    })
    .sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, 12)
    .map((record) => {
      const dueDate = new Date(record.due_date as string);
      return {
        id: record.id,
        companyName: record.company?.company_name || "Firma",
        amount: record.amount,
        currency: record.currency,
        dueDate: record.due_date as string,
        status: record.status,
        invoiceNo: record.invoice_no,
        servicePeriod: record.service_period,
        dayLabel: dueDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
        monthLabel: dueDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        isOverdue: record.status === "overdue" || dueDate.getTime() < now.getTime(),
      } satisfies OsgbFinanceCalendarItem;
    });

  const monthKeys = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("tr-TR", { month: "short" });
    return { key, label };
  });

  const financeMonthlyTrend = monthKeys.map(({ key, label }) => {
    const rows = financeRows.filter((record) => {
      const reference = record.due_date || record.invoice_date;
      if (!reference) return false;
      const date = new Date(reference);
      if (Number.isNaN(date.getTime())) return false;
      const rowKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return rowKey === key;
    });

    return {
      month: label,
      pendingAmount: rows.filter((row) => row.status === "pending").reduce((sum, row) => sum + row.amount, 0),
      paidAmount: rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0),
      overdueAmount: rows.filter((row) => row.status === "overdue").reduce((sum, row) => sum + row.amount, 0),
    };
  });

  const documentMonthlyTrend = monthKeys.map(({ key, label }) => {
    const rows = documentRows.filter((record) => {
      const reference = record.expiry_date || record.created_at;
      if (!reference) return false;
      const date = new Date(reference);
      if (Number.isNaN(date.getTime())) return false;
      const rowKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return rowKey === key;
    });

    return {
      month: label,
      activeCount: rows.filter((row) => row.status === "active").length,
      warningCount: rows.filter((row) => row.status === "warning").length,
      expiredCount: rows.filter((row) => row.status === "expired").length,
    };
  });

  return {
    finance: {
      pendingCount: financeRows.filter((item) => item.status === "pending").length,
      pendingAmount: financeRows.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0),
      paidAmount: financeRows.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      overdueCount: financeRows.filter((item) => item.status === "overdue").length,
      overdueAmount: financeRows.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.amount, 0),
      calendarItems,
      monthlyTrend: financeMonthlyTrend,
    },
    documents: {
      activeCount: documentRows.filter((item) => item.status === "active").length,
      warningCount: documentRows.filter((item) => item.status === "warning").length,
      expiredCount: documentRows.filter((item) => item.status === "expired").length,
      expiringSoonCount: documentRows.filter((item) => item.status === "warning" || item.status === "expired").length,
      monthlyTrend: documentMonthlyTrend,
    },
  };
};

export const listOsgbTasks = async (userId: string): Promise<OsgbTaskRecord[]> => {
  const { data, error } = await supabase
    .from("osgb_tasks")
    .select("*, company:isgkatip_companies(company_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OsgbTaskRecord[];
};

export const createOsgbTask = async (userId: string, input: OsgbTaskInput) => {
  const payload = {
    user_id: userId,
    company_id: input.companyId || null,
    related_document_id: input.relatedDocumentId || null,
    related_finance_id: input.relatedFinanceId || null,
    title: input.title,
    description: input.description || null,
    priority: input.priority || "medium",
    status: input.status || "open",
    assigned_to: input.assignedTo || null,
    due_date: input.dueDate || null,
    source: input.source || "manual",
  };

  const { data, error } = await supabase
    .from("osgb_tasks")
    .insert(payload)
    .select("*, company:isgkatip_companies(company_name)")
    .single();

  if (error) throw error;
  return data as OsgbTaskRecord;
};

export const createUpcomingDocumentTasks = async (userId: string, documents: OsgbDocumentRecord[]) => {
  const actionableDocuments = documents.filter((record) => record.status === "warning" || record.status === "expired");
  if (actionableDocuments.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const existingTasks = await listOsgbTasks(userId);
  let created = 0;
  let skipped = 0;

  for (const record of actionableDocuments) {
    const title = `Evrak yenileme: ${record.document_name}`;
    const duplicate = existingTasks.some(
      (task) =>
        task.source === "document_tracking" &&
        task.company_id === record.company_id &&
        task.title === title &&
        task.status !== "cancelled",
    );

    if (duplicate) {
      skipped += 1;
      continue;
    }

    await createOsgbTask(userId, {
      companyId: record.company_id,
      relatedDocumentId: record.id,
      title,
      description: `${record.company?.company_name || "Firma"} için ${record.document_type} belgesi takip edilmeli. Son geçerlilik: ${record.expiry_date || "-"}.`,
      priority: record.status === "expired" ? "critical" : "high",
      dueDate: record.expiry_date,
      source: "document_tracking",
    });
    created += 1;
  }

  return { created, skipped };
};

export const updateOsgbTaskStatus = async (id: string, status: OsgbTaskRecord["status"]) => {
  const { data, error } = await supabase
    .from("osgb_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, company:isgkatip_companies(company_name)")
    .single();

  if (error) throw error;
  return data as OsgbTaskRecord;
};

export const deleteOsgbTask = async (id: string) => {
  const { error } = await supabase.from("osgb_tasks").delete().eq("id", id);
  if (error) throw error;
};

export const listOsgbNotes = async (userId: string): Promise<OsgbNoteRecord[]> => {
  const { data, error } = await supabase
    .from("osgb_notes")
    .select("*, company:isgkatip_companies(company_name)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OsgbNoteRecord[];
};

export const upsertOsgbNote = async (userId: string, input: OsgbNoteInput, id?: string) => {
  const payload = {
    user_id: userId,
    company_id: input.companyId || null,
    title: input.title || null,
    note: input.note,
    note_type: input.noteType || "general",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("osgb_notes")
      .update(payload)
      .eq("id", id)
      .select("*, company:isgkatip_companies(company_name)")
      .single();
    if (error) throw error;
    return data as OsgbNoteRecord;
  }

  const { data, error } = await supabase
    .from("osgb_notes")
    .insert(payload)
    .select("*, company:isgkatip_companies(company_name)")
    .single();
  if (error) throw error;
  return data as OsgbNoteRecord;
};

export const deleteOsgbNote = async (id: string) => {
  const { error } = await supabase.from("osgb_notes").delete().eq("id", id);
  if (error) throw error;
};
