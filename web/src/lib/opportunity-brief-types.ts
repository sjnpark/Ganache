// Types for the Opportunity Brief feature (post-pivot MVP, see CLAUDE.md
// Section 3.1 / 3.1.1). Kept in their own file instead of the shared
// `types.ts` so this feature stays a self-contained module with its own
// input/output contract — Seojin can wire it into the final site without
// this file colliding with what Seojin/Yeonwoo are independently changing
// in `types.ts` on their own branches.
//
// Field shapes are deliberately kept structurally close to Yeonwoo's
// `OpportunitySignal` / `OpportunityEvidenceItem` (origin/yeonwoo:
// web/src/lib/types.ts) and Seojin's `Opportunity` (origin/seojin:
// web/src/lib/types.ts), so that once those branches merge, their real
// data can be passed in here with little or no adapting.

// --- Input: what this module receives (it does NOT query Supabase itself) ---

export type OpportunitySignalInput = {
  title: string;
  summary: string | null;
  source: string | null;
  relevance_score: number | null;
  tags: string[];
};

// Structurally matches Yeonwoo's OpportunityEvidenceItem.
export type OpportunityBriefEvidenceItem = {
  content_id: string;
  content_title: string;
  channel: string;
  qualified_leads: number;
  matched_via: "insight" | "title";
  insight_text: string | null;
};

// A superset of Seojin's narrower BusinessContext — all of the extra
// fields are optional so this still works if only the original narrow
// shape is available.
export type OpportunityBriefBusinessContext = {
  company_name: string;
  company_description: string | null;
  target_audience: string | null;
  tone_and_manner: string | null;
  products_services?: string | null;
  value_propositions?: string | null;
  brand_positioning?: string | null;
  preferred_terminology?: Record<string, string> | null;
  prohibited_terminology?: Record<string, string> | null;
  sensitive_topics?: string | null;
};

export type GenerateOpportunityBriefInput = {
  signal: OpportunitySignalInput;
  // Pass [] when no internal evidence was found — the brief will say so
  // explicitly rather than inventing a metric.
  internalEvidence: OpportunityBriefEvidenceItem[];
  businessContext: OpportunityBriefBusinessContext | null;
};

// --- Output: the Opportunity Brief itself ---

export const KNOWN_CHANNELS = [
  "blog_kr",
  "blog_en",
  "linkedin",
  "youtube",
  "newsletter",
  "pr",
  "webinar",
  "other",
] as const;

export type KnownChannel = (typeof KNOWN_CHANNELS)[number];

export type OpportunityBriefChannelRecommendation = {
  channel: string;
  label: string;
  reason: string;
};

export type OpportunityBriefAlternativeChannel = {
  channel: string;
  label: string;
  suggested_format_or_angle: string;
};

// Evidence-strength tiers, strongest first — see CLAUDE.md 3.1 governing
// principles: qualified inquiry data is the ground truth; attention
// metrics (views/clicks/likes) are never proof of B2B conversion.
export type EvidenceTier =
  | "downstream_business_outcome" // contract / additional training / upsell / account expansion
  | "qualified_inquiry" // lead_events.qualified = true — strongest evidence usually available
  | "strong_engagement" // actual workshop/webinar attendance, repeat participation
  | "conversion_action" // workshop/webinar registration, CTA submission
  | "attention_metric"; // views / clicks / likes — attention only, NOT proof of conversion

export type OpportunityBriefSuccessMetric = {
  metric: string;
  tier: EvidenceTier;
  rationale: string;
};

export type OpportunityBriefSource = {
  type: "external" | "internal";
  label: string;
  detail: string | null;
};

export type OpportunityBrief = {
  opportunity_title: string;
  why_now: string;
  recommended_target_audience: string;
  recommended_channel: OpportunityBriefChannelRecommendation;
  alternative_channels: OpportunityBriefAlternativeChannel[];
  main_content_angle: string;
  talking_points: string[];
  recommended_marketing_action: string;
  success_metrics: OpportunityBriefSuccessMetric[];
  confidence: number | null;
  has_internal_evidence: boolean;
  internal_evidence: OpportunityBriefEvidenceItem[];
  // Built from the input, not the model — guarantees sources are never
  // hallucinated.
  sources: OpportunityBriefSource[];
};
