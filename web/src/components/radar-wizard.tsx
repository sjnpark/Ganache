"use client";

import { useState, useTransition } from "react";
import { generateBriefAction } from "@/app/radar/actions";
import { OpportunityBriefCard } from "@/components/opportunity-brief-card";
import type { OpportunityBrief } from "@/lib/opportunity-brief-types";
import type { OpportunityCandidate, Trend, ValidationState } from "@/lib/types";

const VALIDATION_LABEL: Record<
  ValidationState,
  { label: string; note: string; className: string }
> = {
  supported: {
    label: "근거 있음",
    note: "실제 qualified B2B 문의로 뒷받침됩니다.",
    className:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
  },
  partial_evidence: {
    label: "부분 근거",
    note: "관련 콘텐츠는 있지만 문의 근거는 아직 없습니다.",
    className:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
  },
  validation_needed: {
    label: "검증 필요",
    note: "내부 비즈니스 근거가 없습니다. 외부 신호만으로 판단해야 합니다.",
    className:
      "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
  },
};

const TIER_LABEL: Record<string, string> = {
  downstream_business_outcome: "다운스트림 비즈니스 성과",
  qualified_b2b_inquiry: "Qualified B2B 문의",
  strong_engagement_outcome: "실제 참석 / 재참여",
  conversion_action: "등록 / CTA 제출",
  attention_only: "주목도 지표 (참고용)",
};

function Step({
  n,
  title,
  active,
  done,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border p-5 transition-opacity ${
        active || done
          ? "border-neutral-200 dark:border-neutral-800 opacity-100"
          : "border-neutral-100 dark:border-neutral-900 opacity-40"
      } bg-white dark:bg-neutral-900`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-semibold ${
            done
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// The handoff payload. This is the whole point of the copy button: the
// approved brief has to survive being pasted into a writing tool that has no
// access to Ganache, so the evidence constraints travel with it — otherwise
// the downstream model is free to invent the numbers we deliberately withheld.
//
// `candidate` is passed in (rather than read off the brief) because the
// validation state and rationale live on Yeonwoo's Opportunity Candidate, not
// on Ahyoung's brief object.
function briefToPlainText(
  brief: OpportunityBrief,
  candidate: OpportunityCandidate | null
): string {
  const lines = [
    `# ${brief.opportunity_title}`,
    ``,
    `## 왜 지금인가`,
    brief.why_now,
    ``,
    `## 추천 대상 독자`,
    brief.recommended_target_audience,
    ``,
    ...(candidate
      ? [
          `## 근거 및 검증 제약`,
          `검증 상태: ${VALIDATION_LABEL[candidate.validation_state].label} — ${VALIDATION_LABEL[candidate.validation_state].note}`,
          ...(candidate.evidence_tier
            ? [
                `근거 등급: ${TIER_LABEL[candidate.evidence_tier] ?? candidate.evidence_tier}`,
              ]
            : []),
          `판단 근거: ${candidate.rationale}`,
          ``,
        ]
      : []),
    // Mirrors the card: the adaptation plan replaces the single-channel
    // recommendation when present, and the old line is kept for briefs
    // generated before that upgrade.
    ...(brief.channel_adaptation
      ? [
          `## 채널 적응 계획`,
          `핵심 아이디어 (모든 채널 공통): ${brief.channel_adaptation.core_idea}`,
          ``,
          `### 블로그 — canonical 콘텐츠`,
          `- 핵심 각도: ${brief.channel_adaptation.blog.angle}`,
          ...(brief.channel_adaptation.blog.emphasis
            ? [`- 강조할 것: ${brief.channel_adaptation.blog.emphasis}`]
            : []),
          ...(brief.channel_adaptation.blog.search_strategy_link
            ? [`- 검색 전략 연결: ${brief.channel_adaptation.blog.search_strategy_link}`]
            : []),
          ``,
          `### LinkedIn`,
          `- 재구성: ${brief.channel_adaptation.linkedin.reframe}`,
          `- 훅: ${brief.channel_adaptation.linkedin.hook}`,
          `- 이유: ${brief.channel_adaptation.linkedin.why}`,
          ``,
          `### Instagram / Facebook`,
          `- 축약·시각화: ${brief.channel_adaptation.instagram_facebook.reframe}`,
          `- 훅: ${brief.channel_adaptation.instagram_facebook.hook}`,
          `- 이유: ${brief.channel_adaptation.instagram_facebook.why}`,
          ``,
          `### PR / 미디어`,
          brief.channel_adaptation.pr_media.is_relevant
            ? `- ${brief.channel_adaptation.pr_media.angle_or_reason}`
            : `- 해당 없음. ${brief.channel_adaptation.pr_media.angle_or_reason}`,
          ``,
        ]
      : [
          `## 추천 채널`,
          `${brief.recommended_channel.channel} — ${brief.recommended_channel.reason}`,
          ``,
        ]),
    // Search strategy is co-equal to the channel recommendation in the brief,
    // so the handoff copy must carry it too. Optional on the type, so guard.
    // Optional fields are skipped rather than pasted as empty labels, so the
    // copied brief matches what the card actually showed.
    ...(brief.search_strategy
      ? [
          `## 검색 & AI 발견 전략`,
          ...(brief.search_strategy.primary_keyword
            ? [`핵심 키워드: ${brief.search_strategy.primary_keyword}`]
            : []),
          ...(brief.search_strategy.why_this_keyword
            ? [`이 키워드를 고른 이유: ${brief.search_strategy.why_this_keyword}`]
            : []),
          `검색 의도: ${brief.search_strategy.target_search_intent}`,
          `보조 키워드: ${brief.search_strategy.recommended_keywords.join(", ")}`,
          ...(brief.search_strategy.search_competitor_insight
            ? [`검색 경쟁 상황: ${brief.search_strategy.search_competitor_insight}`]
            : []),
          ...(brief.search_strategy.content_framing
            ? [`콘텐츠 프레이밍: ${brief.search_strategy.content_framing}`]
            : []),
          `제목 방향: ${brief.search_strategy.seo_title_direction}`,
          `소제목(H2/H3) 가이드: ${brief.search_strategy.subheading_keywords.join(", ")}`,
          ...(brief.search_strategy.aeo_questions?.length
            ? [
                `AEO 질문:`,
                ...brief.search_strategy.aeo_questions.map((q) => `  - ${q}`),
              ]
            : []),
          ...(brief.search_strategy.geo_entity_angle
            ? [`GEO / 엔티티 각도: ${brief.search_strategy.geo_entity_angle}`]
            : []),
          `의사결정자 적합성: ${brief.search_strategy.decision_maker_fit}`,
          ...(brief.search_strategy.evidence_rationale
            ? [`근거: ${brief.search_strategy.evidence_rationale}`]
            : []),
          ``,
        ]
      : []),
    `## 콘텐츠 앵글`,
    brief.main_content_angle,
    ``,
    `## 핵심 메시지`,
    ...brief.talking_points.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `## 내부 근거`,
    brief.has_internal_evidence
      ? brief.internal_evidence
          .map(
            (e) =>
              `- ${e.content_title} (${e.channel}): qualified 문의 ${e.qualified_leads}건`
          )
          .join("\n")
      : "내부 비즈니스 근거 없음 — 외부 신호만으로 판단이 필요합니다.",
    ``,
    `## 추천 액션 / CTA`,
    brief.recommended_marketing_action,
    ``,
    // Success metrics were removed from the card UI but are still generated,
    // and the writing tool needs them to know what the piece is aiming at.
    // These are proposals for what to measure, NOT measured results.
    ...(brief.success_metrics.length > 0
      ? [
          `## 성공 지표 제안 (측정 대상 — 실측치 아님)`,
          ...brief.success_metrics.map(
            (m) => `- ${m.metric} — ${m.rationale}`
          ),
          ``,
        ]
      : []),
    `## 출처`,
    ...brief.sources.map(
      (s) => `- [${s.type}] ${s.label}${s.detail ? ` — ${s.detail}` : ""}`
    ),
    ``,
    `---`,
    ``,
    `## 실행 지시 (이 Brief를 받은 AI에게)`,
    `Use this approved Opportunity Brief as the decision context for final content creation. Preserve the target audience, Search & AI Discovery Strategy, Channel Adaptation Plan, CTA, and evidence constraints. Do not invent unsupported claims or metrics.`,
    ``,
    `위 지시를 한국어로 옮기면: 승인된 이 Opportunity Brief를 최종 콘텐츠 제작의 판단 근거로 사용하세요. 대상 독자, 검색 & AI 발견 전략, 채널 적응 계획, CTA, 근거 제약을 그대로 유지하세요. 근거 없는 주장이나 수치를 지어내지 마세요.`,
  ];
  return lines.join("\n");
}

export function RadarWizard({
  signals,
  candidates,
}: {
  signals: Trend[];
  candidates: OpportunityCandidate[];
}) {
  const [signal, setSignal] = useState<Trend | null>(null);
  const [brief, setBrief] = useState<OpportunityBrief | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Exact UUID match — candidate.id is the Supabase trends primary key,
  // the same value as signal.id. No title/fuzzy matching.
  const candidate = signal
    ? (candidates.find((c) => c.id === signal.id) ?? null)
    : null;

  function pickSignal(s: Trend) {
    setError(null);
    setSignal(s);
    setBrief(null);
    setDecision(null);
    setCopied(false);
  }

  function requestBrief() {
    if (!candidate) return;
    setError(null);
    setBrief(null);
    setDecision(null);
    startTransition(async () => {
      try {
        setBrief(await generateBriefAction(candidate.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Brief 생성에 실패했어요.");
      }
    });
  }

  async function copyBrief() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(briefToPlainText(brief, candidate));
      setCopied(true);
    } catch {
      setError("클립보드 복사에 실패했어요. 브라우저 권한을 확인해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-2">
          {error}
        </p>
      )}

      {/* Step 1 — Weekly Radar (Seojin) */}
      <Step n={1} title="Weekly Radar — 이번 주 시장 신호" active={!signal} done={!!signal}>
        {signals.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
            아직 수집된 시장 신호가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signals.map((s) => {
              const selected = signal?.id === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pickSignal(s)}
                    disabled={pending}
                    className={`w-full text-left rounded-md border px-3 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                      selected
                        ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="font-medium">{s.title}</span>
                    {/* relevance_score is deliberately not shown. It is an
                        internal heuristic, not a measured market metric, so
                        displaying it as a percentage implied a precision we
                        cannot defend. It still exists on the row and is passed
                        to brief generation as context. */}
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {s.source ?? "출처 미기재"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Step>

      {/* Step 2 — Opportunity Candidate + evidence (Yeonwoo) */}
      <Step
        n={2}
        title="Why this Opportunity — 근거와 검증 상태"
        active={!!signal && !brief}
        done={!!brief}
      >
        {!signal ? (
          <p className="text-sm text-neutral-400 italic">위에서 신호를 먼저 선택하세요.</p>
        ) : !candidate ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
            이 신호에 대한 Opportunity Candidate를 찾지 못했어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${VALIDATION_LABEL[candidate.validation_state].className}`}
              >
                {VALIDATION_LABEL[candidate.validation_state].label}
              </span>
              {candidate.evidence_tier && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {TIER_LABEL[candidate.evidence_tier] ?? candidate.evidence_tier}
                </span>
              )}
            </div>

            <p className="text-neutral-700 dark:text-neutral-200">{candidate.rationale}</p>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {VALIDATION_LABEL[candidate.validation_state].note}
            </p>

            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                내부 근거
              </p>
              {candidate.hasInternalEvidence ? (
                <ul className="flex flex-col gap-1">
                  {candidate.evidence.map((e) => (
                    <li
                      key={e.content_id}
                      className="text-xs text-neutral-600 dark:text-neutral-300"
                    >
                      · {e.content_title} ({e.channel}) — qualified 문의{" "}
                      {e.qualified_leads}건
                      <span className="text-neutral-400"> / 매칭: {e.matched_via}</span>
                      {/* Display-only: seeded demo rows carry a [DEMO] title
                          prefix. Labelled explicitly so a synthetic record is
                          never mistaken for a real Codepresso outcome during
                          the demo (CLAUDE.md Section 9). */}
                      {e.content_title.startsWith("[DEMO]") && (
                        <span className="block mt-0.5 text-amber-700 dark:text-amber-400">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 font-medium">
                            Demo Internal Evidence
                          </span>{" "}
                          Synthetic data for prototype demonstration
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                  내부 비즈니스 근거 없음 — 이 기회는 아직 실제 문의로 검증되지
                  않았습니다.
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-400">
              출처: {candidate.signal.source ?? "출처 미기재"}
              {candidate.signal.url && (
                <>
                  {" · "}
                  <a
                    href={candidate.signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    원문 보기
                  </a>
                </>
              )}
              {" · trend "}
              {candidate.id}
            </p>

            <div>
              <button
                type="button"
                onClick={requestBrief}
                disabled={pending}
                className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
              >
                {pending ? "Brief 생성 중..." : "Opportunity Brief 만들기"}
              </button>
            </div>
          </div>
        )}
      </Step>

      {/* Step 3 — Opportunity Brief (Ahyoung) + Step 4 — Human decision */}
      <Step n={3} title="Opportunity Brief" active={!!candidate && !brief} done={!!brief}>
        {!candidate ? (
          <p className="text-sm text-neutral-400 italic">신호를 선택하면 만들 수 있어요.</p>
        ) : !brief ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {pending
              ? "Opportunity Brief를 생성하고 있어요. 분석에 잠시 시간이 걸릴 수 있습니다."
              : "위 버튼을 눌러 Brief를 생성하세요."}
          </p>
        ) : (
          <OpportunityBriefCard
            brief={brief}
            onApprove={() => setDecision("approved")}
            onReject={() => setDecision("rejected")}
          />
        )}
      </Step>

      <Step
        n={4}
        title="Human Review & AI Handoff — 검토 · 승인 · 전달"
        active={!!brief && !decision}
        done={!!decision}
      >
        {!brief ? (
          <p className="text-sm text-neutral-400 italic">
            Brief가 생성되면 위 카드에서 승인 또는 반려할 수 있어요.
          </p>
        ) : !decision ? (
          // Pre-approval. The checklist names the four things a marketer
          // should actually look at, because "승인/반려" alone gave no clue
          // what the review was for.
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-neutral-700 dark:text-neutral-200">
              승인하기 전에 아래 네 가지를 확인해주세요. 최종 결정은 사람이 합니다.
            </p>
            <ul className="flex flex-col gap-1.5 text-neutral-600 dark:text-neutral-300">
              {[
                "왜 지금인가 — 근거와 검증 상태가 납득되는지",
                "검색 & AI 발견 전략 — 키워드와 검색 의도가 맞는지",
                "채널 적응 계획 — 블로그·LinkedIn·SNS 방향이 적절한지",
                "전체 실행 방향 — 코드프레소가 실제로 실행할 만한지",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-neutral-400 shrink-0">□</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              확인 후 위 Brief 카드의 승인 / 반려 버튼을 눌러주세요.
            </p>
          </div>
        ) : decision === "rejected" ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            반려했습니다. 다른 신호를 선택해 다시 검토해보세요.
          </p>
        ) : (
          // Post-approval: the handoff. Ganache stops here by design
          // (CLAUDE.md 3.1.1) — we hand the approved Brief over, we do not
          // write the draft, and we are NOT integrated with any of the tools
          // named below. The marketer pastes it in themselves.
          <div className="flex flex-col gap-3 text-sm">
            <p className="font-medium text-neutral-800 dark:text-neutral-100">
              승인됨 — AI 핸드오프 준비 완료
            </p>
            <p className="text-neutral-700 dark:text-neutral-200">
              이 Brief를 복사해서 아래와 같은 글쓰기 AI에 붙여넣으면 초안 작성을
              이어갈 수 있습니다.
            </p>
            <ul className="flex flex-col gap-1 text-neutral-600 dark:text-neutral-300">
              {[
                "코드프레소 사내 AI",
                "Claude",
                "ChatGPT",
                "그 외 선호하는 글쓰기 모델",
              ].map((tool) => (
                <li key={tool} className="flex gap-2">
                  <span className="text-neutral-400 shrink-0">·</span>
                  <span>{tool}</span>
                </li>
              ))}
            </ul>
            <div>
              <button
                type="button"
                onClick={copyBrief}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700"
              >
                {copied ? "복사됨 ✓" : "Brief 복사하기"}
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              복사본에는 근거·검증 제약, 검색 & AI 발견 전략, 채널 적응 계획,
              CTA, 그리고 &ldquo;근거 없는 수치를 지어내지 말라&rdquo;는 실행
              지시가 함께 들어갑니다. Ganache는 여기까지 — 위 도구들과 직접
              연동되어 있지는 않으니, 복사해서 붙여넣어 주세요.
            </p>
          </div>
        )}
      </Step>
    </div>
  );
}
