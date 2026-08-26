export type BusinessContext = {
  id: string;
  company_name: string;
  company_description: string | null;
  target_audience: string | null;
  tone_and_manner: string | null;
  tone_guide_version: string | null;
};

export type Trend = {
  id: string;
  title: string;
  summary: string | null;
  source: string | null;
  relevance_score: number | null;
  status: string;
  collected_at: string;
  tags: string[];
};

export type ContentPipelineRow = {
  id: string;
  title: string;
  channel: string;
  status: string;
  content_group_id: string | null;
  published_at: string | null;
  platform_url: string | null;
  views: number | null;
  leads: number | null;
  conversion_rate: number | null;
  latest_review_status: string | null;
};

// --- Stage 7: Performance Collection / Lead Tracking ---

export type ContentLatestMetricRow = {
  content_id: string;
  content_title: string | null;
  channel: string | null;
  views: number;
  clicks: number | null;
  leads: number;
  conversion_rate: number | null;
  collected_at: string;
};

export type LeadEventRow = {
  id: string;
  content_id: string | null;
  content_title: string | null;
  channel: string | null;
  inquiry_type: string;
  qualified: boolean;
  attribution_source: string | null;
  created_at: string;
};

// --- Stage 8: Data Accumulation / Insight (read-only overview) ---

export type ContentInsightRow = {
  id: string;
  content_id: string | null;
  content_title: string | null;
  insight_type: string;
  insight_text: string;
  confidence: number | null;
  created_at: string;
};

export type ContentPerformanceSummaryRow = {
  content_id: string;
  content_title: string;
  channel: string;
  views: number;
  clicks: number | null;
  qualified_leads: number;
  total_leads: number;
};

export type ChannelLeadSummaryRow = {
  channel: string;
  qualified_leads: number;
  total_leads: number;
  views: number;
};

// --- Opportunity Candidate (read-only, computed in application logic — NOT
// a DB table, and NOT derived from `ideas`). Combines one external trend
// signal with matching internal evidence. See CLAUDE.md Section 3.1: an
// Opportunity is distinct from a Content Idea. ---

export type OpportunitySignal = {
  trend_id: string;
  trend_title: string;
  relevance_score: number | null;
  tags: string[];
};

export type OpportunityEvidenceItem = {
  content_id: string;
  content_title: string;
  channel: string;
  qualified_leads: number;
  matched_via: "insight" | "title";
  insight_text: string | null;
};

export type OpportunityCandidate = {
  signal: OpportunitySignal;
  matchedTags: string[];
  evidence: OpportunityEvidenceItem[];
  hasInternalEvidence: boolean;
};
