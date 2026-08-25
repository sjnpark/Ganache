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
