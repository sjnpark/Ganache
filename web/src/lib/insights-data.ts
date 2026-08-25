import { createSupabaseServerClient } from "./supabase-server";
import type {
  ChannelLeadSummaryRow,
  ContentInsightRow,
  ContentPerformanceSummaryRow,
} from "./types";

export type InsightsOverview = {
  insights: ContentInsightRow[];
  qualifiedLeadCount: number;
  totalLeadCount: number;
  totalViews: number;
  totalClicks: number;
  byContent: ContentPerformanceSummaryRow[];
  byChannel: ChannelLeadSummaryRow[];
};

// Read-only aggregation for the Stage 8 Insight Overview screen. This does
// NOT write anything — it only reads content_insights, contents,
// content_latest_metrics, and lead_events, then combines them in memory so a
// human can see why a content/channel looks like it's working, using
// lead_events.qualified = true as the ground truth for "real B2B lead"
// (never content_metrics.leads or raw views).
export async function getInsightsOverview(): Promise<InsightsOverview> {
  const supabase = createSupabaseServerClient();

  const [insightsRes, contentsRes, metricsRes, leadsRes] = await Promise.all([
    supabase
      .from("content_insights")
      .select("id, content_id, insight_type, insight_text, confidence, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("contents").select("id, title, channel"),
    supabase.from("content_latest_metrics").select("content_id, views, clicks"),
    supabase.from("lead_events").select("content_id, channel, qualified"),
  ]);

  if (insightsRes.error) throw insightsRes.error;
  if (contentsRes.error) throw contentsRes.error;
  if (metricsRes.error) throw metricsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const contents = contentsRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const leads = leadsRes.data ?? [];

  const contentById = new Map(contents.map((c) => [c.id, c]));

  const insights: ContentInsightRow[] = (insightsRes.data ?? []).map((i) => ({
    id: i.id,
    content_id: i.content_id,
    content_title: i.content_id ? contentById.get(i.content_id)?.title ?? null : null,
    insight_type: i.insight_type,
    insight_text: i.insight_text,
    confidence: i.confidence,
    created_at: i.created_at,
  }));

  const qualifiedLeadCount = leads.filter((l) => l.qualified).length;
  const totalLeadCount = leads.length;
  const totalViews = metrics.reduce((sum, m) => sum + (m.views ?? 0), 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks ?? 0), 0);

  const metricsByContent = new Map(metrics.map((m) => [m.content_id, m]));
  const leadCountsByContent = new Map<string, { qualified: number; total: number }>();
  for (const l of leads) {
    if (!l.content_id) continue;
    const entry = leadCountsByContent.get(l.content_id) ?? { qualified: 0, total: 0 };
    entry.total += 1;
    if (l.qualified) entry.qualified += 1;
    leadCountsByContent.set(l.content_id, entry);
  }

  const byContent: ContentPerformanceSummaryRow[] = contents
    .map((c) => {
      const m = metricsByContent.get(c.id);
      const l = leadCountsByContent.get(c.id) ?? { qualified: 0, total: 0 };
      return {
        content_id: c.id,
        content_title: c.title,
        channel: c.channel,
        views: m?.views ?? 0,
        clicks: m?.clicks ?? null,
        qualified_leads: l.qualified,
        total_leads: l.total,
      };
    })
    .sort((a, b) => b.qualified_leads - a.qualified_leads);

  const channelMap = new Map<
    string,
    { qualified: number; total: number; views: number }
  >();
  for (const row of byContent) {
    const entry = channelMap.get(row.channel) ?? { qualified: 0, total: 0, views: 0 };
    entry.qualified += row.qualified_leads;
    entry.total += row.total_leads;
    entry.views += row.views;
    channelMap.set(row.channel, entry);
  }
  // Leads that carry a channel but no content_id aren't covered by byContent above.
  for (const l of leads) {
    if (l.content_id || !l.channel) continue;
    const entry = channelMap.get(l.channel) ?? { qualified: 0, total: 0, views: 0 };
    entry.total += 1;
    if (l.qualified) entry.qualified += 1;
    channelMap.set(l.channel, entry);
  }

  const byChannel: ChannelLeadSummaryRow[] = Array.from(channelMap.entries())
    .map(([channel, v]) => ({
      channel,
      qualified_leads: v.qualified,
      total_leads: v.total,
      views: v.views,
    }))
    .sort((a, b) => b.qualified_leads - a.qualified_leads);

  return {
    insights,
    qualifiedLeadCount,
    totalLeadCount,
    totalViews,
    totalClicks,
    byContent,
    byChannel,
  };
}
