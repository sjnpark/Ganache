import { createSupabaseServerClient } from "./supabase-server";
import { generateJson } from "./gemini";
import type { Idea, Trend } from "./types";

const VALID_CHANNELS = [
  "blog_kr",
  "blog_en",
  "linkedin",
  "youtube",
  "newsletter",
  "pr",
  "webinar",
  "other",
];

type GeneratedIdea = {
  title: string;
  description: string;
  rationale: string;
  target_audience: string;
  recommended_channel: string;
  marketing_goal: string;
};

type RecentMetric = {
  content_id: string;
  views: number;
  leads: number;
  collected_at: string;
};

type ContentTitleChannel = {
  id: string;
  title: string;
  channel: string;
};

export async function generateIdeasFromContext(): Promise<Idea[]> {
  const supabase = createSupabaseServerClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [businessContextRes, recentMetricsRes, trendsRes] = await Promise.all(
    [
      supabase
        .from("business_context")
        .select("*")
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("content_metrics")
        .select("content_id, views, leads, collected_at")
        .gte("collected_at", sevenDaysAgo)
        .order("collected_at", { ascending: false })
        .limit(20),
      supabase
        .from("trends")
        .select("*")
        .order("collected_at", { ascending: false })
        .limit(5),
    ]
  );

  if (businessContextRes.error) throw businessContextRes.error;
  if (recentMetricsRes.error) throw recentMetricsRes.error;
  if (trendsRes.error) throw trendsRes.error;

  const businessContext = businessContextRes.data;
  const recentMetrics = (recentMetricsRes.data ?? []) as RecentMetric[];
  const trends = (trendsRes.data ?? []) as Trend[];

  const contentIds = [...new Set(recentMetrics.map((m) => m.content_id))];
  let contentsById = new Map<string, ContentTitleChannel>();
  if (contentIds.length > 0) {
    const { data: contentsData, error: contentsError } = await supabase
      .from("contents")
      .select("id, title, channel")
      .in("id", contentIds);
    if (contentsError) throw contentsError;
    contentsById = new Map(
      (contentsData ?? []).map((c) => [c.id, c as ContentTitleChannel])
    );
  }

  const contextText = `
Codepresso 비즈니스 컨텍스트:
${businessContext?.company_description ?? "없음"}
타깃: ${businessContext?.target_audience ?? "없음"}
톤앤매너: ${businessContext?.tone_and_manner ?? "없음"}

지난 7일 콘텐츠 성과:
${
  recentMetrics.length > 0
    ? recentMetrics
        .map((m) => {
          const c = contentsById.get(m.content_id);
          return `- ${c?.title ?? "제목 없음"} (${c?.channel ?? "?"}): 조회수 ${m.views}, 리드 ${m.leads}`;
        })
        .join("\n")
    : "최근 7일간 수집된 성과 데이터 없음"
}

최근 트렌드/이슈:
${
  trends.length > 0
    ? trends
        .map(
          (t) => `- ${t.title}: ${t.summary ?? ""} (관련도 ${t.relevance_score ?? "?"})`
        )
        .join("\n")
    : "등록된 트렌드 없음"
}
`.trim();

  const instruction = `
당신은 Codepresso(B2B AI 교육/역량진단/AX 컨설팅 기업)의 마케팅 콘텐츠 기획자입니다.
아래 컨텍스트(비즈니스 정보, 지난 7일 성과, 최근 트렌드)를 참고해서 콘텐츠 아이디어 3개를 제안하세요.

규칙:
- 목표는 조회수가 아니라 B2B 리드(문의) 생성입니다.
- 각 아이디어는 지난 성과나 최근 트렌드 중 최소 하나와 명확히 연결되어야 하고, rationale에 그 연결을 설명하세요.
- recommended_channel은 반드시 다음 중 하나여야 합니다: ${VALID_CHANNELS.join(", ")}
- 존재하지 않는 고객 사례, 수치, 서비스명을 지어내지 마세요.

다음 JSON 형식으로만 응답하세요:
{"ideas": [{"title": "...", "description": "...", "rationale": "...", "target_audience": "...", "recommended_channel": "...", "marketing_goal": "..."}]}
`.trim();

  const result = await generateJson<{ ideas: GeneratedIdea[] }>({
    instruction,
    content: contextText,
  });

  const trendIds = trends.map((t) => t.id);
  const inserted: Idea[] = [];

  for (const idea of result.ideas) {
    const channel = VALID_CHANNELS.includes(idea.recommended_channel)
      ? idea.recommended_channel
      : "other";

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title: idea.title,
        description: idea.description,
        rationale: idea.rationale,
        target_audience: idea.target_audience,
        recommended_channel: channel,
        marketing_goal: idea.marketing_goal,
        status: "proposed",
      })
      .select()
      .single();

    if (error) throw error;
    inserted.push(data as Idea);

    if (trendIds.length > 0) {
      const { error: linkError } = await supabase
        .from("idea_trends")
        .insert(trendIds.map((trendId) => ({ idea_id: data.id, trend_id: trendId })));
      if (linkError) throw linkError;
    }
  }

  return inserted;
}

export async function getIdeas(): Promise<Idea[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Idea[];
}
