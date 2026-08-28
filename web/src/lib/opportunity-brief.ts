import { generateJson } from "./gemini";
import { searchContextText } from "./search-context";
import {
  KNOWN_CHANNELS,
  type GenerateOpportunityBriefInput,
  type OpportunityBrief,
  type OpportunityBriefAlternativeChannel,
  type OpportunityBriefBusinessContext,
  type OpportunityBriefChannelAdaptation,
  type OpportunityBriefChannelRecommendation,
  type OpportunityBriefEvidenceItem,
  type OpportunityBriefSearchStrategy,
  type OpportunityBriefSource,
  type OpportunitySignalInput,
  type SuccessMetricCategory,
} from "./opportunity-brief-types";

// This module takes its inputs as plain arguments and never touches
// Supabase itself — the caller (whichever page/agent already has the
// signal, evidence, and business context) is responsible for fetching
// those. That keeps this a pure "data in -> brief out" function with a
// small, stable contract, so it can be dropped into Seojin's Radar wizard
// or any other page without pulling in a DB dependency of its own.

const VALID_SUCCESS_METRIC_CATEGORIES: SuccessMetricCategory[] = [
  "qualified_b2b_inquiry",
  "enterprise_inquiry",
  "organic_search_traffic",
  "search_visibility",
  "conversion_action",
  "attention_metric",
];

// What we ask Gemini for. Deliberately excludes anything that must be
// traceable to a real source (internal_evidence, sources) — those are
// attached afterward from the input the caller gave us, never invented by
// the model.
type GeneratedBriefJudgment = {
  opportunity_title: string;
  why_now: string;
  recommended_target_audience: string;
  recommended_channel: { channel: string; label: string; reason: string };
  alternative_channels: {
    channel: string;
    label: string;
    suggested_format_or_angle: string;
  }[];
  // Channel Adaptation Plan. Optional here because the model may omit it;
  // normalizeChannelAdaptation returns undefined in that case and the card
  // falls back to the recommended/alternative channel blocks.
  channel_adaptation?: {
    core_idea?: string;
    blog?: { angle?: string; emphasis?: string; search_strategy_link?: string };
    linkedin?: { reframe?: string; hook?: string; why?: string };
    instagram_facebook?: { reframe?: string; hook?: string; why?: string };
    pr_media?: { is_relevant?: boolean; angle_or_reason?: string };
  };
  search_strategy: {
    recommended_keywords: string[];
    seo_title_direction: string;
    subheading_keywords: string[];
    target_search_intent: string;
    decision_maker_fit: string;
    // Added by the Search & AI Discovery upgrade. Optional here because the
    // model may omit them, and normalizeSearchStrategy drops empties rather
    // than emitting blank rows.
    primary_keyword?: string;
    why_this_keyword?: string;
    search_competitor_insight?: string;
    content_framing?: string;
    aeo_questions?: string[];
    geo_entity_angle?: string;
    evidence_rationale?: string;
  };
  main_content_angle: string;
  talking_points: string[];
  recommended_marketing_action: string;
  success_metrics: { metric: string; category: string; rationale: string }[];
  confidence: number;
};

function businessContextText(ctx: OpportunityBriefBusinessContext | null): string {
  if (!ctx) return "회사 컨텍스트가 아직 등록되지 않았습니다.";
  return `
회사명: ${ctx.company_name}
회사 설명: ${ctx.company_description ?? "정보 없음"}
타깃 고객: ${ctx.target_audience ?? "정보 없음"}
제품/서비스: ${ctx.products_services ?? "정보 없음"}
가치 제안: ${ctx.value_propositions ?? "정보 없음"}
브랜드 포지셔닝: ${ctx.brand_positioning ?? "정보 없음"}
톤앤매너 요약: ${ctx.tone_and_manner ?? "정보 없음"}
선호 용어: ${ctx.preferred_terminology ? JSON.stringify(ctx.preferred_terminology) : "정보 없음"}
금지 용어: ${ctx.prohibited_terminology ? JSON.stringify(ctx.prohibited_terminology) : "정보 없음"}
민감 주제 안내: ${ctx.sensitive_topics ?? "정보 없음"}
`.trim();
}

function signalText(signal: OpportunitySignalInput): string {
  return `
제목: ${signal.title}
요약: ${signal.summary ?? "정보 없음"}
출처: ${signal.source ?? "정보 없음"}
시장 관심도(참고용, B2B 전환 증거 아님): ${signal.relevance_score ?? "미평가"}
태그: ${signal.tags.join(", ") || "없음"}
`.trim();
}

function evidenceText(evidence: OpportunityBriefEvidenceItem[]): string {
  if (evidence.length === 0) {
    return "제공된 내부 증거 없음. success_metrics는 conversion_action 이하 수준에서만 제안하고, rationale에 '내부 증거 없음 — 검증 필요'라고 명시하세요.";
  }
  return evidence
    .map((e) => {
      const via = e.matched_via === "insight" ? "insight 매칭" : "제목 매칭";
      const insight = e.insight_text ? ` · insight: "${e.insight_text}"` : "";
      return `- ${e.content_title} (${e.channel}) · qualified_leads ${e.qualified_leads} · ${via}${insight}`;
    })
    .join("\n");
}

const INSTRUCTION = `
당신은 Codepresso(B2B AI 교육/역량진단/AX 컨설팅 기업)의 마케팅 전략가입니다.
주어진 외부 시장/경쟁사 신호와 내부 증거를 바탕으로 "Opportunity Brief"를 작성하세요.

이 Brief는 최종 원고가 아니라, 사람이 검토 후 진행 여부를 결정하는 전략 요약입니다.
실제 글(블로그/LinkedIn 포스트 등)을 쓰지 마세요 — 채널, 검색 전략, 각도, 핵심 메시지만 제안하면 됩니다.

[채널 적응 계획] — Codepresso는 블로그 아티클을 먼저 쓰고, 같은 내용을 LinkedIn·인스타/페이스북 등으로 변형해 올립니다. 따라서 "채널 하나를 고르는 것"이 아니라 "하나의 핵심 아이디어가 채널마다 어떻게 달라지는지"를 알려주세요.

- 채널은 서로 배타적이지 않습니다. LinkedIn 각도를 제안한다고 해서 블로그에 올리지 말라는 뜻이 절대 아닙니다.
- core_idea에 모든 채널이 공유할 핵심 아이디어 1개를 쓰세요. 아래 각 채널은 이 아이디어의 변형이어야 합니다.
- 완성된 글이나 게시물 본문을 쓰지 마세요. 어떻게 변형할지만 제안하세요.
- 각 채널마다 왜 그 변형이 그 플랫폼에 맞는지(why) 반드시 설명하세요.
- 플랫폼별 도달률·참여율·전환율 같은 성과 수치를 지어내지 마세요. 측정된 값이 없습니다.
- 간결하게, 판단에 필요한 만큼만 쓰세요.

채널별 지침:
- blog: Codepresso의 canonical(기준) 콘텐츠입니다. angle에 롱폼 핵심 각도, emphasis에 블로그에서 특히 강조할 것, search_strategy_link에 위 검색 전략(핵심 키워드·소제목·AEO 질문)과 어떻게 연결되는지를 쓰세요.
- linkedin: 같은 아이디어를 엔터프라이즈 의사결정자 / HR·L&D 독자에게 맞게 어떻게 다시 잡을지(reframe), 어떤 훅으로 시작할지(hook), 왜 그게 이 독자에게 맞는지(why).
- instagram_facebook: 같은 아이디어를 어떻게 짧게 줄이거나 시각화할지(reframe), 캐러셀/비주얼 요약 훅(hook), 왜 그 형태가 맞는지(why).
- pr_media: 이 기회에 진짜 뉴스 가치(행사, 파트너십, 신규 리포트 발간, 주요 기업 동향 등)가 있을 때만 is_relevant를 true로 하고 angle_or_reason에 보도 앵글을 쓰세요. 뉴스 가치가 없으면 is_relevant를 false로 하고 angle_or_reason에 왜 PR이 필요 없는지 쓰세요. PR 앵글을 억지로 만들어내지 마세요.

또한 아래 기존 필드도 계속 채우세요 (하위 호환용):
- recommended_channel의 channel 값은 반드시 다음 중 하나여야 합니다: ${KNOWN_CHANNELS.join(", ")}. 이 기회에 가장 먼저 만들 canonical 채널을 고르세요(보통 blog_kr).
- alternative_channels에는 그 외 실제로 쓸만한 채널 2~4개와 짧은 suggested_format_or_angle. channel 값도 위 목록 중에서만.

[검색 & AI 발견 전략] — Codepresso 인바운드의 70~80%가 검색(구글/네이버)에서 발생하므로, 채널 추천만큼 중요하게 다루세요.
아래 8개 규칙은 항상 적용됩니다. 아래에 별도로 주어지는 "검색 환경 관측 결과"는 시점이 찍힌 참고 근거이며, 규칙과 충돌하면 규칙을 따르세요.

규칙 1. 모호한 키워드를 검색 의도 설명 없이 추천하지 마세요.
규칙 2. 일반 키워드의 실제 검색 의도가 Codepresso의 B2B 의도와 다르면, 임직원 / 조직 / 전사 / 기업 같은 한정어를 붙여 좁히세요.
규칙 3. 근거가 뒷받침할 때는 일반적인 "교육 제공사" 표현보다 Codepresso가 강한 측정·진단·검증 각도를 우선하세요.
규칙 4. aeo_questions에 의사결정자가 AI 어시스턴트에게 실제로 물어볼 법한 자연어 질문을 최소 1개 넣으세요.
규칙 5. 검색 결과를 점유한 곳(검색 경쟁자)과 사업 경쟁사를 구분해서 쓰세요. 같은 집합이 아닙니다.
규칙 6. primary_keyword를 하나 고르고, why_this_keyword에 왜 그 키워드/표현을 골랐는지 반드시 설명하세요. 한정어를 붙였다면 그 이유도 쓰세요.
규칙 7. 검색량, CTR, 순위, 트래픽, 전환 수치를 절대 지어내지 마세요. 측정된 값이 주어지지 않았다면 없다고 쓰세요.
규칙 8. 비교 / 연도 / 비용 / 국비지원 / 판단 기준 / 사례 / 구체적 숫자 / 실행 설계 같은 프레이밍은 이 주제에 실제로 맞을 때만 쓰는 선택지입니다. 매 Brief에 억지로 넣지 마세요. 맞는 게 없으면 content_framing을 생략하세요.

필드별 작성 지침:
- primary_keyword: 이 콘텐츠가 노릴 핵심 키워드 1개.
- why_this_keyword: 규칙 6에 따른 선택 이유.
- target_search_intent: 이 키워드를 검색하는 사람이 실제로 알고 싶어하거나 해결하려는 것.
- recommended_keywords: primary를 보조하는 키워드 3~5개.
- search_competitor_insight: 이 영역 검색 결과를 누가 점유하고 있고 Codepresso는 어디에 서 있는지. 근거가 없으면 "관측 근거 없음"이라고 쓰세요.
- content_framing: 규칙 8. 선택적.
- seo_title_direction: 완성된 제목이 아니라 방향성 또는 예시 1~2개.
- subheading_keywords: H2/H3 소제목에 들어갈 핵심 용어.
- aeo_questions: 규칙 4. 자연어 질문 형태로.
- geo_entity_angle: "어떤 회사가 X를 하나?"라고 AI에 물었을 때 Codepresso가 호명되려면 어떤 엔티티로 포지셔닝해야 하는지.
- evidence_rationale: 이 전략이 어떤 관측 근거에 기반했는지, 그리고 무엇이 측정 불가였는지. 규칙 7 준수.
- decision_maker_fit: 이 주제가 왜 시니어 엔터프라이즈 독자(팀장/임원/C-Level)에게 적합한지.

[핵심 talking points]
- talking_points는 정확히 2~3개만.

[성공 지표 제안]
- success_metrics의 category 값은 반드시 다음 중 하나여야 합니다: qualified_b2b_inquiry, enterprise_inquiry, organic_search_traffic, search_visibility, conversion_action, attention_metric
- 이 category는 "지금까지의 증거가 얼마나 강한가"가 아니라 "이 기회를 실행하면 앞으로 무엇을 측정해야 하는가"를 나타냅니다. 아래 우선순위를 따르되, 내부 증거가 뒷받침하지 않는 지표를 억지로 끌어올리지 마세요:
  1. qualified_b2b_inquiry / enterprise_inquiry — 최종 목표는 결국 실제 B2B 문의로 이어지는지 여부입니다
  2. organic_search_traffic — 검색을 통한 유입
  3. search_visibility — 검색 노출/순위 (실측 데이터가 있을 때만 의미 있음)
  4. conversion_action — 등록, CTA 제출
  5. attention_metric — 조회수/클릭/좋아요 (참고용, B2B 전환 증거 아님)
- 지표는 "실행하면 이걸 측정해봐야 한다"는 제안입니다. 이미 관측된 수치인 것처럼 쓰지 마세요 (예: "현재 검색 3위" 같은 표현 금지 — "검색 노출을 추적해볼 만함" 같은 제안형으로 쓰세요).
- 제공된 내부 증거가 없으면 qualified_b2b_inquiry/enterprise_inquiry를 억지로 제안하지 말고, rationale에 "내부 증거 없음 — 검증 필요"라고 쓰세요.

[사실 안전 규칙]
- 존재하지 않는 시장 사실, 성과 수치, 문의 건수, 워크숍 결과, 고객 사례, 검색량, SEO 점수, 순위, 출처를 지어내지 마세요. 제공된 정보에 없는 것은 언급하지 마세요.
- 경쟁사/시장의 조회수·좋아요·바이럴은 시장 관심 신호일 뿐입니다 — 문의나 매출을 만들었다고 주장하지 마세요.

[기타]
- recommended_marketing_action은 구체적인 CTA/액션으로 쓰세요 (예: "웨비나 등록 유도", "AI 역량진단 상담 신청 CTA 배치").
- confidence는 0.0~1.0 사이 숫자로, 이 추천에 대한 확신도를 나타내세요.

다음 JSON 형식으로만 응답하세요:
{"opportunity_title": "...", "why_now": "...", "recommended_target_audience": "...", "recommended_channel": {"channel": "...", "label": "...", "reason": "..."}, "alternative_channels": [{"channel": "...", "label": "...", "suggested_format_or_angle": "..."}], "channel_adaptation": {"core_idea": "...", "blog": {"angle": "...", "emphasis": "...", "search_strategy_link": "..."}, "linkedin": {"reframe": "...", "hook": "...", "why": "..."}, "instagram_facebook": {"reframe": "...", "hook": "...", "why": "..."}, "pr_media": {"is_relevant": false, "angle_or_reason": "..."}}, "search_strategy": {"primary_keyword": "...", "why_this_keyword": "...", "target_search_intent": "...", "recommended_keywords": ["...", "..."], "search_competitor_insight": "...", "content_framing": "...", "seo_title_direction": "...", "subheading_keywords": ["...", "..."], "aeo_questions": ["...", "..."], "geo_entity_angle": "...", "evidence_rationale": "...", "decision_maker_fit": "..."}, "main_content_angle": "...", "talking_points": ["...", "..."], "recommended_marketing_action": "...", "success_metrics": [{"metric": "...", "category": "...", "rationale": "..."}], "confidence": 0.0}
`.trim();

function normalizeChannel(
  raw: { channel: string; label: string; reason: string } | undefined
): OpportunityBriefChannelRecommendation {
  if (!raw) {
    return { channel: "other", label: "미정", reason: "모델이 채널을 추천하지 않았습니다." };
  }
  const isKnown = (KNOWN_CHANNELS as readonly string[]).includes(raw.channel);
  return {
    channel: isKnown ? raw.channel : "other",
    label: raw.label || raw.channel,
    reason: raw.reason ?? "",
  };
}

function normalizeAlternatives(
  raw: { channel: string; label: string; suggested_format_or_angle: string }[] | undefined
): OpportunityBriefAlternativeChannel[] {
  if (!raw) return [];
  return raw.map((c) => ({
    channel: (KNOWN_CHANNELS as readonly string[]).includes(c.channel) ? c.channel : "other",
    label: c.label || c.channel,
    suggested_format_or_angle: c.suggested_format_or_angle ?? "",
  }));
}

function normalizeChannelAdaptation(
  raw: GeneratedBriefJudgment["channel_adaptation"] | undefined
): OpportunityBriefChannelAdaptation | undefined {
  // Blog is the canonical content, so a plan without a blog angle is not a
  // usable plan — fall back to the older channel blocks instead of rendering
  // a half-empty section.
  if (!raw?.core_idea?.trim() || !raw?.blog?.angle?.trim()) return undefined;

  const item = (v: { reframe?: string; hook?: string; why?: string } | undefined) => ({
    reframe: v?.reframe?.trim() ?? "",
    hook: v?.hook?.trim() ?? "",
    why: v?.why?.trim() ?? "",
  });

  return {
    core_idea: raw.core_idea.trim(),
    blog: {
      angle: raw.blog.angle.trim(),
      emphasis: raw.blog.emphasis?.trim() ?? "",
      search_strategy_link: raw.blog.search_strategy_link?.trim() ?? "",
    },
    linkedin: item(raw.linkedin),
    instagram_facebook: item(raw.instagram_facebook),
    pr_media: {
      // Default to false: PR is opt-in, so an omitted or malformed flag must
      // never be read as "yes, pitch this to press".
      is_relevant: raw.pr_media?.is_relevant === true,
      angle_or_reason: raw.pr_media?.angle_or_reason?.trim() ?? "",
    },
  };
}

function normalizeSuccessMetrics(
  raw: { metric: string; category: string; rationale: string }[] | undefined
) {
  if (!raw) return [];
  return raw.map((m) => ({
    metric: m.metric,
    category: (VALID_SUCCESS_METRIC_CATEGORIES as string[]).includes(m.category)
      ? (m.category as SuccessMetricCategory)
      : "attention_metric",
    rationale: m.rationale ?? "",
  }));
}

function normalizeSearchStrategy(
  raw: GeneratedBriefJudgment["search_strategy"] | undefined
): OpportunityBriefSearchStrategy | undefined {
  if (!raw) return undefined;
  // Optional fields are left undefined when the model omits them (or returns
  // an empty string) so the card renders nothing rather than an empty row.
  const text = (v: string | undefined) => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return {
    recommended_keywords: (raw.recommended_keywords ?? []).slice(0, 5),
    seo_title_direction: raw.seo_title_direction ?? "",
    subheading_keywords: raw.subheading_keywords ?? [],
    target_search_intent: raw.target_search_intent ?? "",
    decision_maker_fit: raw.decision_maker_fit ?? "",
    primary_keyword: text(raw.primary_keyword),
    why_this_keyword: text(raw.why_this_keyword),
    search_competitor_insight: text(raw.search_competitor_insight),
    content_framing: text(raw.content_framing),
    aeo_questions: (raw.aeo_questions ?? [])
      .map((q) => q?.trim())
      .filter((q): q is string => Boolean(q))
      .slice(0, 4),
    geo_entity_angle: text(raw.geo_entity_angle),
    evidence_rationale: text(raw.evidence_rationale),
  };
}

// Built entirely from the caller's input, never from the model — this is
// what makes "traceable sources" a guarantee rather than a prompt request.
function buildSources(input: GenerateOpportunityBriefInput): OpportunityBriefSource[] {
  const sources: OpportunityBriefSource[] = [
    {
      type: "external",
      label: input.signal.title,
      detail: input.signal.source,
    },
  ];
  for (const ev of input.internalEvidence) {
    sources.push({
      type: "internal",
      label: ev.content_title,
      detail: ev.insight_text ?? `${ev.channel} · qualified leads ${ev.qualified_leads}`,
    });
  }
  return sources;
}

export async function generateOpportunityBrief(
  input: GenerateOpportunityBriefInput
): Promise<OpportunityBrief> {
  const content = `
[외부 시장/경쟁사 신호]
${signalText(input.signal)}

[내부 증거]
${evidenceText(input.internalEvidence)}

[Codepresso 비즈니스 컨텍스트]
${businessContextText(input.businessContext)}

${searchContextText()}
`.trim();

  const judgment = await generateJson<GeneratedBriefJudgment>({
    instruction: INSTRUCTION,
    content,
  });

  return {
    opportunity_title: judgment.opportunity_title,
    why_now: judgment.why_now,
    recommended_target_audience: judgment.recommended_target_audience,
    recommended_channel: normalizeChannel(judgment.recommended_channel),
    alternative_channels: normalizeAlternatives(judgment.alternative_channels),
    channel_adaptation: normalizeChannelAdaptation(judgment.channel_adaptation),
    search_strategy: normalizeSearchStrategy(judgment.search_strategy),
    main_content_angle: judgment.main_content_angle,
    talking_points: (judgment.talking_points ?? []).slice(0, 3),
    recommended_marketing_action: judgment.recommended_marketing_action ?? "",
    success_metrics: normalizeSuccessMetrics(judgment.success_metrics),
    confidence: typeof judgment.confidence === "number" ? judgment.confidence : null,
    has_internal_evidence: input.internalEvidence.length > 0,
    internal_evidence: input.internalEvidence,
    sources: buildSources(input),
  };
}
