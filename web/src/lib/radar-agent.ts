import { createSupabaseServerClient } from "./supabase-server";
import { generateJson } from "./gemini";
import type { BusinessContext, Idea, Opportunity, Trend } from "./types";

const VALID_CHANNELS = ["linkedin", "blog_kr", "youtube", "newsletter"];

// Shared: the company context every step is grounded in. Without it Ganache is
// just a generic LLM, so every prompt below includes it.
function companyContextText(ctx: BusinessContext | null): string {
  if (!ctx) return "회사 컨텍스트가 아직 등록되지 않았습니다.";
  return [
    `회사: ${ctx.company_name}`,
    `소개: ${ctx.company_description ?? "없음"}`,
    `타깃 고객: ${ctx.target_audience ?? "없음"}`,
    `톤앤매너: ${ctx.tone_and_manner ?? "없음"}`,
  ].join("\n");
}

async function getCurrentContext(): Promise<BusinessContext | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_context")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data as BusinessContext | null;
}

// ---------------------------------------------------------------------------
// Step 1 — Weekly Radar: the market signals we are currently watching.
// ---------------------------------------------------------------------------
export async function getRadar(): Promise<{
  companyContext: BusinessContext | null;
  signals: Trend[];
}> {
  const supabase = createSupabaseServerClient();
  const [ctxRes, signalsRes] = await Promise.all([
    supabase.from("business_context").select("*").eq("is_current", true).maybeSingle(),
    // Archived signals are retired from the product experience but kept in the
    // table so existing idea_trends links stay intact. Must match the same
    // filter in getInsightsOverview so Radar and Opportunity Candidate work
    // off one identical active signal set.
    supabase
      .from("trends")
      .select("*")
      .neq("status", "archived")
      .order("collected_at", { ascending: false })
      .limit(8),
  ]);

  if (ctxRes.error) throw ctxRes.error;
  if (signalsRes.error) throw signalsRes.error;

  return {
    companyContext: ctxRes.data as BusinessContext | null,
    signals: (signalsRes.data ?? []) as Trend[],
  };
}

// ---------------------------------------------------------------------------
// SUPERSEDED — kept for rollback only, NOT used by the production flow.
//
// Everything below (analyzeOpportunity, generateIdeasForOpportunity) predates
// the pivot. The production Opportunity is now Yeonwoo's evidence-backed
// OpportunityCandidate (lib/insights-data.ts), and content-idea drafting is
// out of MVP scope per CLAUDE.md Section 3.1. `getRadar()` above IS still
// used. Delete this section once the new end-to-end flow is verified.
//
// Step 2 — Opportunity: why this signal matters to THIS company, right now.
// Deliberately not persisted (see the Opportunity type).
// ---------------------------------------------------------------------------
export async function analyzeOpportunity(
  signalId: string
): Promise<{ signal: Trend; opportunity: Opportunity }> {
  const supabase = createSupabaseServerClient();

  const [ctx, signalRes] = await Promise.all([
    getCurrentContext(),
    supabase.from("trends").select("*").eq("id", signalId).single(),
  ]);
  if (signalRes.error) throw signalRes.error;
  const signal = signalRes.data as Trend;

  const instruction = `
당신은 B2B 마케팅 전략가입니다.
아래 "회사 정보"와 "시장 신호"를 보고, 이 회사가 지금 이 신호를 어떻게 기회로 활용해야 하는지 분석하세요.

규칙:
- 신호를 요약만 하지 말고, "이 회사에게" 무엇을 의미하는지 해석하세요.
- 회사명을 다른 경쟁사로 바꿔도 그대로 말이 되는 일반론은 쓰지 마세요.
- 존재하지 않는 고객 사례, 수치, 서비스명을 지어내지 마세요.
- risk에는 근거가 부족하거나 사람이 확인해야 할 부분을 솔직히 쓰세요. 없으면 "특이사항 없음".

다음 JSON 형식으로만 응답하세요:
{"headline": "지금 이걸 말해야 하는 이유를 한 문장으로", "why_now": "왜 하필 지금인지", "angle": "이 회사가 잡아야 할 구체적인 각도", "target_audience": "누구에게 말할 것인가", "risk": "주의할 점"}
`.trim();

  const content = `
[회사 정보]
${companyContextText(ctx)}

[시장 신호]
제목: ${signal.title}
요약: ${signal.summary ?? "없음"}
출처: ${signal.source ?? "없음"}
관련도: ${signal.relevance_score ?? "미평가"}
태그: ${signal.tags?.join(", ") || "없음"}
`.trim();

  const opportunity = await generateJson<Opportunity>({ instruction, content });
  return { signal, opportunity };
}

// ---------------------------------------------------------------------------
// Step 4 — Ideas, grounded in company context + the chosen opportunity + the
// chosen channel. These ARE persisted, and linked back to the source signal.
// ---------------------------------------------------------------------------
export async function generateIdeasForOpportunity(params: {
  signalId: string;
  opportunity: Opportunity;
  channel: string;
}): Promise<Idea[]> {
  const supabase = createSupabaseServerClient();
  const channel = VALID_CHANNELS.includes(params.channel) ? params.channel : "other";

  const ctx = await getCurrentContext();
  const { opportunity } = params;

  const instruction = `
당신은 위 회사의 콘텐츠 기획자입니다.
주어진 "기회"를 선택된 채널에 맞는 콘텐츠 아이디어 3개로 구체화하세요.

규칙:
- 목표는 조회수가 아니라 B2B 문의(리드) 생성입니다.
- 3개 모두 같은 기회에서 나오되, 서로 다른 각도여야 합니다.
- rationale에는 이 아이디어가 위 기회/신호와 어떻게 연결되는지 쓰세요.
- 선택된 채널의 소비 방식에 맞는 형식으로 제안하세요.
- 존재하지 않는 고객 사례, 수치, 서비스명을 지어내지 마세요.

다음 JSON 형식으로만 응답하세요:
{"ideas": [{"title": "...", "description": "...", "rationale": "...", "marketing_goal": "..."}]}
`.trim();

  const content = `
[회사 정보]
${companyContextText(ctx)}

[선택된 기회]
핵심: ${opportunity.headline}
왜 지금: ${opportunity.why_now}
각도: ${opportunity.angle}
대상: ${opportunity.target_audience}
주의할 점: ${opportunity.risk}

[선택된 채널]
${channel}
`.trim();

  const result = await generateJson<{
    ideas: { title: string; description: string; rationale: string; marketing_goal: string }[];
  }>({ instruction, content });

  const inserted: Idea[] = [];

  for (const idea of result.ideas) {
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title: idea.title,
        description: idea.description,
        rationale: idea.rationale,
        target_audience: opportunity.target_audience,
        recommended_channel: channel,
        marketing_goal: idea.marketing_goal,
        status: "proposed",
      })
      .select()
      .single();

    if (error) throw error;
    inserted.push(data as Idea);

    // Traceability: the idea stays linked to the signal it came from, even
    // though the opportunity itself is not stored.
    const { error: linkError } = await supabase
      .from("idea_trends")
      .insert({ idea_id: data.id, trend_id: params.signalId });
    if (linkError) throw linkError;
  }

  return inserted;
}
