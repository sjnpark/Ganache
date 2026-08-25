import { createSupabaseServerClient } from "./supabase-server";
import type { ContentLatestMetricRow, LeadEventRow } from "./types";

export type PerformanceOverview = {
  metrics: ContentLatestMetricRow[];
  leads: LeadEventRow[];
  qualifiedLeadCount: number;
};

// Source of truth for the B2B lead KPI is lead_events.qualified, not the
// content_metrics.leads aggregate — see CLAUDE.md Section 3 and
// docs/db-schema.md Section 2 (lead_events is the itemized, auditable ledger).
export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  const supabase = createSupabaseServerClient();

  const [contentsRes, metricsRes, leadsRes] = await Promise.all([
    supabase.from("contents").select("id, title, channel"),
    supabase
      .from("content_latest_metrics")
      .select("*")
      .order("collected_at", { ascending: false }),
    supabase
      .from("lead_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (contentsRes.error) throw contentsRes.error;
  if (metricsRes.error) throw metricsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const contentById = new Map(
    (contentsRes.data ?? []).map((c) => [c.id, { title: c.title, channel: c.channel }])
  );

  const metrics: ContentLatestMetricRow[] = (metricsRes.data ?? []).map((m) => ({
    content_id: m.content_id,
    content_title: contentById.get(m.content_id)?.title ?? null,
    channel: contentById.get(m.content_id)?.channel ?? null,
    views: m.views,
    clicks: m.clicks,
    leads: m.leads,
    conversion_rate: m.conversion_rate,
    collected_at: m.collected_at,
  }));

  const leads: LeadEventRow[] = (leadsRes.data ?? []).map((l) => ({
    id: l.id,
    content_id: l.content_id,
    content_title: l.content_id ? contentById.get(l.content_id)?.title ?? null : null,
    channel: l.channel,
    inquiry_type: l.inquiry_type,
    qualified: l.qualified,
    attribution_source: l.attribution_source,
    created_at: l.created_at,
  }));

  const qualifiedLeadCount = leads.filter((l) => l.qualified).length;

  return { metrics, leads, qualifiedLeadCount };
}
