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
  // Already a column on the trends table; surfaced here so the UI can link
  // back to the original public source. Nullable.
  url: string | null;
  relevance_score: number | null;
  status: string;
  collected_at: string;
  tags: string[];
};

// An Opportunity is NOT persisted — it is generated on demand from a market
// signal + the current company context, and lives only in the wizard's state
// until an idea is generated from it.
export type Opportunity = {
  headline: string;
  why_now: string;
  angle: string;
  target_audience: string;
  risk: string;
};

export const CHANNEL_OPTIONS = [
  { id: "linkedin", label: "LinkedIn", hint: "의사결정권자 대상 짧고 강한 인사이트" },
  { id: "blog_kr", label: "Blog", hint: "검색 유입 + 깊이 있는 설명" },
  { id: "youtube", label: "YouTube", hint: "복잡한 주제를 쉽게 이해시키기" },
  { id: "newsletter", label: "Newsletter", hint: "기존 구독자 관계 유지" },
] as const;

export type Idea = {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  target_audience: string | null;
  recommended_channel: string | null;
  marketing_goal: string | null;
  status: string;
  planning_session_id: string | null;
  created_at: string;
};

export type PlanningSession = {
  id: string;
  week_of: string;
  transcript: string | null;
  summary: string | null;
  created_at: string;
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
// Owned by Yeonwoo. These two arrived with the insight/evidence cherry-picks
// as surrounding context; the /performance pages that use them were
// deliberately not integrated, so they are currently unreferenced. Kept so the
// type vocabulary stays identical to the yeonwoo branch.

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
  summary: string | null;
  source: string | null;
  // Link to the original public source, when the trend row has one. Nullable —
  // older/synthetic signals have no traceable URL, and the UI must render
  // without a link rather than inventing one.
  url: string | null;
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

// Business-evidence strength hierarchy — see CLAUDE.md Section 3.1
// (Governing principles). Only "qualified_b2b_inquiry" and "attention_only"
// are ever computed today, because Codepresso has not yet supplied
// workshop-attendance, repeat-participation, or business-expansion data. Do
// not fabricate the other tiers — they exist here only so this type is
// forward-compatible once that data becomes available.
export type EvidenceTier =
  | "downstream_business_outcome"
  | "qualified_b2b_inquiry"
  | "strong_engagement_outcome"
  | "conversion_action"
  | "attention_only";

export type ValidationState = "supported" | "partial_evidence" | "validation_needed";

export type OpportunityCandidate = {
  // Stable identifier for this MVP — always equal to signal.trend_id (one
  // candidate per trend today). Not a new DB id/table.
  id: string;
  signal: OpportunitySignal;
  matchedTags: string[];
  evidence: OpportunityEvidenceItem[];
  hasInternalEvidence: boolean;
  evidence_tier: EvidenceTier | null;
  validation_state: ValidationState;
  // Deterministic, template-generated explanation — never LLM-generated,
  // never invents facts beyond matchedTags/evidence.
  rationale: string;
};
