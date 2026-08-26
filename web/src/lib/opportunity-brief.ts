import { generateJson } from "./gemini";
import {
  KNOWN_CHANNELS,
  type EvidenceTier,
  type GenerateOpportunityBriefInput,
  type OpportunityBrief,
  type OpportunityBriefAlternativeChannel,
  type OpportunityBriefBusinessContext,
  type OpportunityBriefChannelRecommendation,
  type OpportunityBriefEvidenceItem,
  type OpportunityBriefSource,
  type OpportunitySignalInput,
} from "./opportunity-brief-types";

// This module takes its inputs as plain arguments and never touches
// Supabase itself — the caller (whichever page/agent already has the
// signal, evidence, and business context) is responsible for fetching
// those. That keeps this a pure "data in -> brief out" function with a
// small, stable contract, so it can be dropped into Seojin's Radar wizard
// or any other page without pulling in a DB dependency of its own.

const VALID_TIERS: EvidenceTier[] = [
  "downstream_business_outcome",
  "qualified_inquiry",
  "strong_engagement",
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
  main_content_angle: string;
  talking_points: string[];
  recommended_marketing_action: string;
  success_metrics: { metric: string; tier: string; rationale: string }[];
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
실제 글(블로그/LinkedIn 포스트 등)을 쓰지 마세요 — 채널, 각도, 핵심 메시지만 제안하면 됩니다.

규칙:
- recommended_channel의 channel 값은 반드시 다음 중 하나여야 합니다: ${KNOWN_CHANNELS.join(", ")}
- 가장 적합한 채널 1개만 recommended_channel로 선정하고, 왜 그 채널인지 reason에 구체적으로 설명하세요.
- alternative_channels에는 recommended_channel과 다른 채널 중 실제로 쓸만한 것 2~4개를 제시하고, 각각 짧은 suggested_format_or_angle을 붙이세요. channel 값도 위 목록 중에서만 고르세요.
- talking_points는 정확히 2~3개만.
- success_metrics를 정할 때 반드시 다음 우선순위를 따르세요 (내부 증거로 뒷받침되는 것 중 가장 강한 것을 우선하되, 억지로 끌어올리지 마세요):
  1. downstream_business_outcome — 계약/추가 교육/업셀/계정 확장
  2. qualified_inquiry — Qualified B2B 문의 (현재 확보 가능한 가장 강력한 지표인 경우가 많음)
  3. strong_engagement — 실제 워크숍/웨비나 참석, 재참여
  4. conversion_action — 워크숍/웨비나 등록, CTA 제출
  5. attention_metric — 조회수/클릭/좋아요 (주목도일 뿐 B2B 전환 증거 아님)
  각 항목의 tier 값은 반드시 위 5개 영문 키워드 중 하나여야 합니다.
- 제공된 내부 증거가 없으면 강한 지표(1~2번)를 절대 지어내지 말고, rationale에 "내부 증거 없음 — 검증 필요"라고 쓰세요.
- 존재하지 않는 시장 사실, 성과 수치, 문의 건수, 워크숍 결과, 고객 사례, 출처를 지어내지 마세요. 제공된 정보에 없는 것은 언급하지 마세요.
- 경쟁사/시장의 조회수·좋아요·바이럴은 시장 관심 신호일 뿐입니다 — 문의나 매출을 만들었다고 주장하지 마세요.
- recommended_marketing_action은 구체적인 CTA/액션으로 쓰세요 (예: "웨비나 등록 유도", "AI 역량진단 상담 신청 CTA 배치").
- confidence는 0.0~1.0 사이 숫자로, 이 추천에 대한 확신도를 나타내세요.

다음 JSON 형식으로만 응답하세요:
{"opportunity_title": "...", "why_now": "...", "recommended_target_audience": "...", "recommended_channel": {"channel": "...", "label": "...", "reason": "..."}, "alternative_channels": [{"channel": "...", "label": "...", "suggested_format_or_angle": "..."}], "main_content_angle": "...", "talking_points": ["...", "..."], "recommended_marketing_action": "...", "success_metrics": [{"metric": "...", "tier": "...", "rationale": "..."}], "confidence": 0.0}
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

function normalizeSuccessMetrics(
  raw: { metric: string; tier: string; rationale: string }[] | undefined
) {
  if (!raw) return [];
  return raw.map((m) => ({
    metric: m.metric,
    tier: (VALID_TIERS as string[]).includes(m.tier) ? (m.tier as EvidenceTier) : "attention_metric",
    rationale: m.rationale ?? "",
  }));
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
