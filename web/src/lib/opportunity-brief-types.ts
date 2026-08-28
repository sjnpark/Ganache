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

// Evidence strength = how strong the supporting Codepresso evidence for
// this Opportunity is. Kept identical to Yeonwoo's canonical hierarchy
// (origin/yeonwoo evidence-strength taxonomy) so the two modules share one
// vocabulary instead of drifting into different names for the same idea.
// Not currently assigned to a field in this module (nothing here grades
// evidence strength yet) — exported for that shared vocabulary, and so a
// future field (here or in Yeonwoo's module) can use it without a rename.
export type EvidenceTier =
  | "downstream_business_outcome"
  | "qualified_b2b_inquiry"
  | "strong_engagement_outcome"
  | "conversion_action"
  | "attention_only";

// Success metric = what we should measure going forward if we act on this
// Opportunity. This is a DIFFERENT axis from EvidenceTier (which grades
// evidence we already have) — do not merge the two back together.
export type SuccessMetricCategory =
  | "qualified_b2b_inquiry"
  | "enterprise_inquiry"
  | "organic_search_traffic"
  | "search_visibility"
  | "conversion_action"
  | "attention_metric";

export type OpportunityBriefSuccessMetric = {
  metric: string;
  category: SuccessMetricCategory;
  rationale: string;
};

export type OpportunityBriefSource = {
  type: "external" | "internal";
  label: string;
  detail: string | null;
};

// Search / keyword strategy — added because ~70-80% of Codepresso's
// inbound currently comes through Google/Naver search, so keyword and
// title/subheading choices matter as much as channel choice. Never carries
// invented search volume, SEO score, or ranking numbers (nothing here is
// backed by real search data).
// "Search & AI Discovery Strategy".
//
// The five original fields are unchanged and still required, so briefs
// generated before the AEO/GEO upgrade still satisfy this type. Everything
// added for that upgrade is optional, and the UI renders each field only when
// present — an older brief object simply shows fewer rows.
export type OpportunityBriefSearchStrategy = {
  recommended_keywords: string[]; // supporting keywords; 3-5, grounded only in the supplied signal + business context
  seo_title_direction: string; // a direction or 1-2 examples, not a finished article title
  subheading_keywords: string[]; // key terms that should appear in H2/H3-style subheadings
  target_search_intent: string; // what the enterprise decision-maker is trying to learn/solve
  decision_maker_fit: string; // why this matters to Codepresso's senior enterprise audience

  // The single keyword the piece should be built around. Separated from the
  // supporting list so the brief commits to one primary target.
  primary_keyword?: string;
  // Rule 6: the primary keyword must come with its reasoning, including any
  // modifier added to disambiguate a generic term.
  why_this_keyword?: string;
  // Rule 5: who actually occupies the SERP, which is not the same set as the
  // business competitors in CLAUDE.md 3.2.
  search_competitor_insight?: string;
  // Rule 8: an optional framing choice (comparison / year / cost / decision
  // criteria / case study / concrete numbers / implementation design) with the
  // reason it fits THIS brief. Omitted when none genuinely applies.
  content_framing?: string;
  // Rule 4: natural-language questions a decision-maker would ask an AI
  // assistant, so the content can be surfaced by answer engines.
  aeo_questions?: string[];
  // How Codepresso should be positioned as an entity for this topic, so a
  // generative engine names it when asked "which company does X".
  geo_entity_angle?: string;
  // Rule 7: which observed evidence this strategy rests on, and what was not
  // measurable. Never contains volume, CTR, ranking or traffic figures.
  evidence_rationale?: string;
};

export type OpportunityBrief = {
  opportunity_title: string;
  why_now: string;
  recommended_target_audience: string;
  recommended_channel: OpportunityBriefChannelRecommendation;
  alternative_channels: OpportunityBriefAlternativeChannel[];
  // Optional so existing callers/mock data built before this field existed
  // keep compiling without changes (safer for Seojin's integration).
  search_strategy?: OpportunityBriefSearchStrategy;
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
