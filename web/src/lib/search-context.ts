// Observed search landscape for Codepresso's keyword territories.
//
// This is PART A of the search-strategy design: dynamic evidence that will go
// stale. It is deliberately separated from the stable decision rules, which
// live in the prompt in `opportunity-brief.ts` (part B).
//
// Everything here was observed by running the actual queries listed in
// `query` fields on 2026-08-27. Nothing is estimated. There are deliberately
// NO search volumes, CTRs, rankings or traffic numbers — we cannot measure
// those, so we do not record them (CLAUDE.md 3.2).
//
// When this gets re-checked, update OBSERVED_ON and the findings together.

export const SEARCH_CONTEXT_OBSERVED_ON = "2026-08-27";

type IntentConflict = {
  query: string;
  whatSerpActuallyReturns: string;
  codepressoMeaning: string;
  saferPhrasings: string[];
};

// Generic keywords whose SERP intent does NOT match Codepresso's B2B meaning.
const INTENT_CONFLICTS: IntentConflict[] = [
  {
    query: "AI 역량진단 기업",
    whatSerpActuallyReturns:
      "채용용 AI 면접·인적성 검사(나무위키 'AI역량검사', jobda.acca.ai 튜토리얼, 프로그래머스 AI 역량평가). 즉 'AI가 지원자를 평가하는 도구'.",
    codepressoMeaning: "재직 중인 임직원의 AI 활용 역량을 진단하는 것.",
    saferPhrasings: [
      "임직원 AI 역량 진단",
      "조직 AI 활용 수준 진단",
      "전사 AI 역량 측정",
    ],
  },
];

// Who actually occupies the SERP for these territories. These are NOT the
// business competitors in CLAUDE.md 3.2 — that distinction is the point.
const SEARCH_COMPETITORS = [
  {
    query: "기업 AI 교육 도입",
    occupiedBy: ["윈스펙", "김지백 강사", "바이브코딩스쿨", "이노핏파트너스", "interaiedu"],
  },
  {
    query: "AI 리터러시 교육 기업",
    occupiedBy: ["워카(Woka)", "한국AI리터러시아카데미", "에이블런", "멋쟁이사자처럼"],
  },
  {
    query: "임직원 AI 활용 역량 어떻게 측정하나 진단 도구",
    occupiedBy: ["넥스트젠 AI-Q", "A-Factor Model", "스파르타 AI 기업교육 블로그"],
  },
];

// Where Codepresso already surfaces, and where it does not.
const CODEPRESSO_VISIBILITY = {
  ranking: [
    {
      query: "기업 AI 교육 도입",
      surfacedContent:
        "전사 AI 교육 사례: 6개 부서가 순서대로 참여한 기업 AI 도입 설계",
      whatWorked: "고객 사례 + 구체적 숫자 + '설계' 프레이밍",
    },
    {
      query: "임직원 AI 활용 역량 어떻게 측정하나 진단 도구",
      surfacedContent:
        "AI Fluent 소개 글과 'AI 역량 진단 서비스 비교' 글이 함께 노출되고, 답변에서 AI Fluent가 도구로 직접 호명됨",
      whatWorked: "측정 방식(프롬프트 로그·산출물 채점, 개발자/비개발자 트랙)을 구체적으로 설명한 점",
    },
  ],
  notSurfacing: [
    {
      query: "AI 리터러시 교육 제공하는 회사 추천",
      namedInstead: [
        "엘리스",
        "에이블런",
        "한국AI리터러시아카데미",
        "한국AI리터러시협회(KAILA)",
        "한국AI리터러시강사협회",
        "한국AI교육진흥원",
      ],
      likelyReason:
        "호명된 6곳 중 4곳이 기관/회사 이름 자체에 'AI리터러시'를 포함. 답변엔진은 '이 카테고리 = 이 엔티티'라고 명시적으로 선언한 곳을 먼저 인용하는 것으로 보임. 코드프레소는 '교육 제공사'로 매핑돼 있지 않음.",
    },
  ],
};

// Title/framing patterns observed on pages that currently rank, and which of
// them Codepresso already uses. Rule 8 in the prompt makes these OPTIONAL —
// they are candidates, not a checklist.
const SERP_FRAMING_PATTERNS = {
  observedOnRankingPages: [
    "비교/선택 프레임 (예: '무료 국비지원 과정 비교', '어떻게 고를까')",
    "연도 명시 (예: '2026 가이드')",
    "비용·국비지원 언급",
    "판단 기준 제공 (예: '실행 순서와 교육 방향 판단', '전략 3가지')",
  ],
  codepressoAlreadyUses: [
    "통념 뒤집기 (예: \"'AI 잘 쓰는 사람'보다 'AI와 일할 줄 아는 조직'이 이깁니다\")",
    "고객사 실명 + AX Grow 사례 (한국 피자헛, 트랜스링크, 에이엠텔레콤)",
    "질문형 (예: '왜 실패하는가', '어디까지 대신할까')",
    "숫자 앵커 (예: '1,928명 조사', '7개 트랙', '반복 업무 4가지')",
    "뉴스 훅 (예: 'SK하이닉스가 자기소개서를 없앤 이유')",
  ],
  codepressoRarelyUses: ["비교/선택 프레임", "연도 명시", "비용·국비지원"],
};

// Codepresso's own published surface, used only as a voice/pattern reference.
// Client names here are ones Codepresso itself published publicly on its blog.
const CODEPRESSO_PUBLISHED_SURFACE = {
  blog: "blog.codepresso.io",
  blogCategories: ["AI Fluent", "AX", "Customer Story", "News", "Event"],
  officialProductNames: [
    "AI Fluent",
    "SkillCertify",
    "SkillCamp",
    "SkillPath",
    "SkillFit",
    "AX Grow",
    "AXMOS",
  ],
  publiclyNamedClients: ["한국 피자헛", "트랜스링크", "에이엠텔레콤"],
  linkedin: "회사 페이지보다 대표(이동훈) 개인 계정이 주 채널로 관측됨",
  pressNote:
    "대표가 KBS 뉴스9에 AI Fluent 주제로 출연한 기록이 있음 (CLAUDE.md 3.2의 'KBS 출연 후 문의 급증'과 일치)",
};

// Rendered into the prompt as evidence. Kept as a plain string builder so the
// shape of this file can change without touching the brief logic.
export function searchContextText(): string {
  return `
[검색 환경 관측 결과 — ${SEARCH_CONTEXT_OBSERVED_ON} 기준]
아래는 실제로 검색을 돌려서 관측한 내용입니다. 검색량·순위·트래픽 수치는 측정할 수 없어 포함하지 않았습니다.
시간이 지나면 낡을 수 있는 정보이므로, 단정적 사실이 아니라 참고 근거로 사용하세요.

■ 검색 의도가 충돌하는 키워드
${INTENT_CONFLICTS.map(
  (c) => `- "${c.query}"
  · 실제 검색 결과: ${c.whatSerpActuallyReturns}
  · 코드프레소가 의도한 뜻: ${c.codepressoMeaning}
  · 권장 대체 표현: ${c.saferPhrasings.join(" / ")}`
).join("\n")}

■ 검색 결과를 실제로 점유 중인 곳 (사업 경쟁사와 다름)
${SEARCH_COMPETITORS.map((s) => `- "${s.query}" → ${s.occupiedBy.join(", ")}`).join("\n")}

■ 코드프레소가 이미 노출되는 영역
${CODEPRESSO_VISIBILITY.ranking
  .map((r) => `- "${r.query}" → ${r.surfacedContent}\n  · 통한 요인: ${r.whatWorked}`)
  .join("\n")}

■ 코드프레소가 노출되지 않는 영역
${CODEPRESSO_VISIBILITY.notSurfacing
  .map(
    (n) => `- "${n.query}" → 대신 호명됨: ${n.namedInstead.join(", ")}
  · 추정 이유: ${n.likelyReason}`
  )
  .join("\n")}

■ 상위 노출 페이지에서 관측된 프레이밍 (선택적 후보일 뿐, 매번 넣지 말 것)
- 관측됨: ${SERP_FRAMING_PATTERNS.observedOnRankingPages.join(" / ")}
- 코드프레소가 이미 쓰는 것: ${SERP_FRAMING_PATTERNS.codepressoAlreadyUses.join(" / ")}
- 코드프레소가 거의 안 쓰는 것: ${SERP_FRAMING_PATTERNS.codepressoRarelyUses.join(" / ")}

■ 코드프레소 공개 콘텐츠 (문체·용어 참고용)
- 블로그: ${CODEPRESSO_PUBLISHED_SURFACE.blog} (카테고리: ${CODEPRESSO_PUBLISHED_SURFACE.blogCategories.join(", ")})
- 공식 제품/프로그램명(변형 금지): ${CODEPRESSO_PUBLISHED_SURFACE.officialProductNames.join(", ")}
- 코드프레소가 직접 공개한 고객사: ${CODEPRESSO_PUBLISHED_SURFACE.publiclyNamedClients.join(", ")}
- LinkedIn: ${CODEPRESSO_PUBLISHED_SURFACE.linkedin}
- 참고: ${CODEPRESSO_PUBLISHED_SURFACE.pressNote}
`.trim();
}
