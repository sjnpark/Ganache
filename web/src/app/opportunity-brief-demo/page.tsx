import { OpportunityBriefCard } from "@/components/opportunity-brief-card";
import type { OpportunityBrief } from "@/lib/opportunity-brief-types";

// TEMPORARY INTEGRATION PREVIEW — NOT part of the app shell/navigation.
// Not linked from NavBar, does not touch Supabase or any shared file.
// All data on this page is hand-written mock data for visually verifying
// <OpportunityBriefCard> layout before wiring it to a real
// generateOpportunityBrief() call. Nothing here is real Codepresso
// business data — see the [DEMO]/[MOCK] labels throughout.

const briefWithEvidence: OpportunityBrief = {
  opportunity_title: "[DEMO] 기업 AI 역량진단 없는 교육 도입의 리스크",
  why_now:
    "[MOCK] 국내 기업의 AI 교육 예산이 2026년 들어 늘고 있다는 외부 신호가 있고, Codepresso 내부에도 같은 주제로 실제 문의로 이어진 콘텐츠 사례가 있어 지금 다시 다루면 반응이 있을 가능성이 높습니다.",
  recommended_target_audience: "[MOCK] 대기업/중견기업 HR·HRD 리더, AX 추진 조직 담당자",
  recommended_channel: {
    channel: "linkedin",
    label: "LinkedIn",
    reason:
      "[MOCK] 의사결정권자가 주로 머무는 채널이고, 과거 유사 주제가 LinkedIn에서 실제 문의로 이어진 내부 증거가 있습니다.",
  },
  alternative_channels: [
    {
      channel: "blog_kr",
      label: "Blog KR",
      suggested_format_or_angle: "[MOCK] SEO 유입을 노린 상세 설명형 아티클",
    },
    {
      channel: "newsletter",
      label: "Newsletter",
      suggested_format_or_angle: "[MOCK] 기존 구독자 대상 짧은 인사이트 + CTA",
    },
    {
      channel: "webinar",
      label: "Webinar",
      suggested_format_or_angle: "[MOCK] 실무 프레임워크를 소개하는 초청형 웨비나",
    },
  ],
  main_content_angle:
    "[MOCK] '수료율은 높은데 왜 현장은 안 바뀌는가' — 역량진단 없이 시작한 교육의 한계를 짚고, 진단 기반 로드맵으로 전환해야 하는 이유를 제시.",
  talking_points: [
    "[MOCK] 수료율/만족도와 실제 업무 적용은 다른 지표다",
    "[MOCK] 직무별·수준별 역량진단이 선행되어야 로드맵이 의미 있다",
    "[MOCK] 진단 데이터가 있어야 교육 성과를 사후에 추적할 수 있다",
  ],
  recommended_marketing_action: "[MOCK] 'AI 역량진단 상담 신청' CTA를 본문 중간과 끝에 배치",
  success_metrics: [
    {
      metric: "[MOCK] LinkedIn 게시물發 Qualified B2B 문의 수",
      tier: "qualified_inquiry",
      rationale:
        "[MOCK] 같은 주제의 과거 콘텐츠가 실제 qualified lead로 이어진 내부 증거가 있어, 이번에도 문의를 핵심 지표로 볼 수 있습니다.",
    },
    {
      metric: "[MOCK] 게시물 조회수/클릭 (참고용)",
      tier: "attention_metric",
      rationale: "[MOCK] 주목도 확인용일 뿐, 그 자체로는 B2B 전환 증거가 아닙니다.",
    },
  ],
  confidence: 0.72,
  has_internal_evidence: true,
  internal_evidence: [
    {
      content_id: "demo-content-1",
      content_title: "[DEMO] 역량진단 없이 AI 교육부터 시작하면 안 되는 이유",
      channel: "blog_kr",
      qualified_leads: 2,
      matched_via: "insight",
      insight_text: "[MOCK] 역량진단 관련 콘텐츠가 조직 단위 문의로 이어진 사례가 있음",
    },
  ],
  sources: [
    {
      type: "external",
      label: "[DEMO] Enterprise AI adoption accelerating in Korea",
      detail: "[MOCK] industry news roundup",
    },
    {
      type: "internal",
      label: "[DEMO] 역량진단 없이 AI 교육부터 시작하면 안 되는 이유",
      detail: "[MOCK] 역량진단 관련 콘텐츠가 조직 단위 문의로 이어진 사례가 있음",
    },
  ],
};

const briefWithoutEvidence: OpportunityBrief = {
  opportunity_title: "[DEMO] 공공기관 AI 리터러시 확대 트렌드",
  why_now:
    "[MOCK] 공공 부문의 AI 리터러시 예산 확대 기사가 나왔지만, 아직 Codepresso 내부에 이 주제로 문의가 발생한 콘텐츠는 없습니다.",
  recommended_target_audience: "[MOCK] 공공기관 및 정부 산하기관 HRD 담당자",
  recommended_channel: {
    channel: "blog_kr",
    label: "Blog KR",
    reason:
      "[MOCK] 아직 검증된 내부 반응이 없는 주제라, 반응을 저비용으로 테스트해볼 수 있는 채널을 우선 추천합니다.",
  },
  alternative_channels: [
    {
      channel: "newsletter",
      label: "Newsletter",
      suggested_format_or_angle: "[MOCK] 짧은 트렌드 소개 + 반응 테스트용 CTA",
    },
  ],
  main_content_angle:
    "[MOCK] 공공기관 AI 리터러시 확대 흐름을 소개하고, Codepresso의 공공 부문 AX 접근법을 짧게 연결.",
  talking_points: [
    "[MOCK] 공공 부문 AI 교육 예산/정책 흐름 요약",
    "[MOCK] 민간과 다른 공공기관 특유의 도입 장벽",
  ],
  recommended_marketing_action: "[MOCK] 뉴스레터 하단에 '공공기관 AX 사례 안내받기' CTA",
  success_metrics: [
    {
      metric: "[MOCK] CTA 클릭/신청 수 (등록·구독 등 전환 행동)",
      tier: "conversion_action",
      rationale: "[MOCK] 내부 증거 없음 — 검증 필요. 아직 qualified lead로 이어진 사례가 없어 전환 행동 수준에서만 지표를 제안합니다.",
    },
  ],
  confidence: 0.35,
  has_internal_evidence: false,
  internal_evidence: [],
  sources: [
    {
      type: "external",
      label: "[DEMO] Public sector AI literacy initiatives expanding in Korea",
      detail: "[MOCK] government policy brief",
    },
  ],
};

export default function OpportunityBriefDemoPage() {
  return (
    <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Opportunity Brief — Preview</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          이 페이지는 임시 통합 미리보기입니다. 앱 네비게이션에 연결되어 있지
          않고, Supabase를 호출하지 않으며, 아래 데이터는 전부{" "}
          <span className="font-semibold">[DEMO] / [MOCK]</span>으로 손으로
          작성한 가짜 데이터입니다. 실제 Codepresso 성과·문의 데이터가
          아닙니다.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          케이스 A — 내부 증거 있음
        </h2>
        <OpportunityBriefCard brief={briefWithEvidence} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          케이스 B — 내부 증거 없음 (검증 필요 상태)
        </h2>
        <OpportunityBriefCard brief={briefWithoutEvidence} />
      </section>
    </main>
  );
}
