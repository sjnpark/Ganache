import { createSupabaseServerClient } from "./supabase-server";
import type {
  ChannelLeadSummaryRow,
  ContentInsightRow,
  ContentPerformanceSummaryRow,
  OpportunityCandidate,
  OpportunityEvidenceItem,
  Trend,
  ValidationState,
} from "./types";

export type InsightsOverview = {
  insights: ContentInsightRow[];
  qualifiedLeadCount: number;
  totalLeadCount: number;
  totalViews: number;
  totalClicks: number;
  byContent: ContentPerformanceSummaryRow[];
  byChannel: ChannelLeadSummaryRow[];
  trends: Trend[];
  opportunities: OpportunityCandidate[];
};

// Read-only aggregation for the Stage 8 Insight / Opportunity Overview
// screen. This does NOT write anything — it only reads content_insights,
// contents, content_latest_metrics, lead_events, and trends, then combines
// them in memory. lead_events.qualified = true is the ground truth for
// "real B2B lead" everywhere (never content_metrics.leads, views, clicks,
// or trend relevance_score). This does NOT read or write `ideas` — an
// Opportunity Candidate here is a computed pairing of one external trend
// with matching internal evidence, not a database row.
export async function getInsightsOverview(): Promise<InsightsOverview> {
  const supabase = createSupabaseServerClient();

  const [insightsRes, contentsRes, metricsRes, leadsRes, trendsRes] = await Promise.all([
    supabase
      .from("content_insights")
      .select("id, content_id, insight_type, insight_text, confidence, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("contents").select("id, title, channel"),
    supabase.from("content_latest_metrics").select("content_id, views, clicks"),
    supabase.from("lead_events").select("content_id, channel, qualified"),
    // `url` is selected so an Opportunity Candidate can carry a link back to
    // the original public source. Archived signals are excluded to match the
    // same filter in getRadar(), so Radar and Opportunity Candidate operate on
    // one identical active signal set.
    supabase
      .from("trends")
      .select("id, title, summary, source, url, relevance_score, status, collected_at, tags")
      .neq("status", "archived")
      .order("collected_at", { ascending: false }),
  ]);

  if (insightsRes.error) throw insightsRes.error;
  if (contentsRes.error) throw contentsRes.error;
  if (metricsRes.error) throw metricsRes.error;
  if (leadsRes.error) throw leadsRes.error;
  if (trendsRes.error) throw trendsRes.error;

  const contents = contentsRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const trends = (trendsRes.data ?? []) as Trend[];

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

  const opportunities = computeOpportunityCandidates(trends, insights, byContent);

  return {
    insights,
    qualifiedLeadCount,
    totalLeadCount,
    totalViews,
    totalClicks,
    byContent,
    byChannel,
    trends,
    opportunities,
  };
}

// Matches whole word `word` inside `text`, case-insensitively. Uses
// non-alphanumeric boundaries instead of \b so it behaves correctly even
// when `text` mixes ASCII tag words with Korean content titles.
function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

// Conservative, deterministic trend <-> internal-evidence matching.
//
// Safeguards (per team decision):
// - Only trend.tags are used as the matching signal (never trend.title or
//   trend.summary, which are far too free-text/generic).
// - A tag must be "discriminating": unique to a single trend in the current
//   trends table. A tag shared by multiple trends (e.g. a generic
//   market/region tag) carries no distinguishing information and is
//   dropped.
// - A tag must be compound (2+ hyphen-separated words). A single generic
//   word such as "ai", "enterprise", or "training" is NEVER enough by
//   itself to create a match — only when ALL of a tag's words are present
//   together (as whole words) in a piece of internal evidence.
// - Evidence's qualified_leads always comes from lead_events.qualified =
//   true via the linked content (byContent) — never from views, clicks,
//   trend relevance_score, or any other attention/virality figure.
// - If nothing passes these checks, the trend is still returned with
//   hasInternalEvidence = false rather than being hidden or force-matched.
function computeOpportunityCandidates(
  trends: Trend[],
  insights: ContentInsightRow[],
  byContent: ContentPerformanceSummaryRow[]
): OpportunityCandidate[] {
  const tagFrequency = new Map<string, number>();
  for (const t of trends) {
    for (const tag of t.tags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
    }
  }

  return trends.map((trend) => {
    const usableTags = trend.tags.filter((tag) => {
      const isDiscriminating = (tagFrequency.get(tag) ?? 0) === 1;
      const wordCount = tag.split("-").filter(Boolean).length;
      return isDiscriminating && wordCount >= 2;
    });

    const matchedTags = new Set<string>();
    const evidenceByContentId = new Map<string, OpportunityEvidenceItem>();

    for (const tag of usableTags) {
      const words = tag.toLowerCase().split("-").filter(Boolean);

      for (const insight of insights) {
        if (!words.every((w) => containsWord(insight.insight_text, w))) continue;
        matchedTags.add(tag);
        if (!insight.content_id) continue;
        const backing = byContent.find((c) => c.content_id === insight.content_id);
        if (backing && !evidenceByContentId.has(backing.content_id)) {
          evidenceByContentId.set(backing.content_id, {
            content_id: backing.content_id,
            content_title: backing.content_title,
            channel: backing.channel,
            qualified_leads: backing.qualified_leads,
            matched_via: "insight",
            insight_text: insight.insight_text,
          });
        }
      }

      for (const c of byContent) {
        if (!words.every((w) => containsWord(c.content_title, w))) continue;
        matchedTags.add(tag);
        if (!evidenceByContentId.has(c.content_id)) {
          evidenceByContentId.set(c.content_id, {
            content_id: c.content_id,
            content_title: c.content_title,
            channel: c.channel,
            qualified_leads: c.qualified_leads,
            matched_via: "title",
            insight_text: null,
          });
        }
      }
    }

    const evidence = Array.from(evidenceByContentId.values()).sort(
      (a, b) => b.qualified_leads - a.qualified_leads
    );

    const totalQualifiedLeads = evidence.reduce((sum, e) => sum + e.qualified_leads, 0);

    // Evidence tier: only ever "qualified_b2b_inquiry" or "attention_only"
    // today (see CLAUDE.md Section 3.1 hierarchy) — the stronger tiers
    // require data Codepresso has not yet provided, so they are never
    // computed here.
    let evidenceTier: OpportunityCandidate["evidence_tier"] = null;
    if (totalQualifiedLeads > 0) {
      evidenceTier = "qualified_b2b_inquiry";
    } else if (evidence.length > 0) {
      const hasAttentionData = evidence.some((e) => {
        const row = byContent.find((c) => c.content_id === e.content_id);
        return (row?.views ?? 0) > 0 || (row?.clicks ?? 0) > 0;
      });
      evidenceTier = hasAttentionData ? "attention_only" : null;
    }

    const validationState: ValidationState =
      totalQualifiedLeads > 0
        ? "supported"
        : evidence.length > 0
          ? "partial_evidence"
          : "validation_needed";

    const matchedTagList = Array.from(matchedTags);
    const tagText = matchedTagList.join(", ");
    let rationale: string;
    if (totalQualifiedLeads > 0) {
      rationale = `This market signal matches ${tagText}. Related Codepresso content generated ${totalQualifiedLeads} qualified B2B lead${totalQualifiedLeads === 1 ? "" : "s"}.`;
    } else if (evidence.length > 0) {
      rationale = `This market signal matches ${tagText}. Related Codepresso content exists, but no qualified B2B inquiry evidence is available yet.`;
    } else {
      rationale =
        "This is a relevant external market signal, but no matching internal business evidence is currently available.";
    }

    return {
      id: trend.id,
      signal: {
        trend_id: trend.id,
        trend_title: trend.title,
        summary: trend.summary,
        source: trend.source,
        url: trend.url,
        relevance_score: trend.relevance_score,
        tags: trend.tags,
      },
      matchedTags: matchedTagList,
      evidence,
      hasInternalEvidence: evidence.length > 0,
      evidence_tier: evidenceTier,
      validation_state: validationState,
      rationale,
    };
  });
}
