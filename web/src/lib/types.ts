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
