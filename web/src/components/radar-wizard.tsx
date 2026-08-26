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

function briefToPlainText(brief: OpportunityBrief): string {
  const lines = [
    `# ${brief.opportunity_title}`,
    ``,
    `## 왜 지금인가`,
    brief.why_now,
    ``,
    `## 추천 대상 독자`,
    brief.recommended_target_audience,
    ``,
    `## 추천 채널`,
    `${brief.recommended_channel.channel} — ${brief.recommended_channel.reason}`,
    ``,
    // Search strategy is co-equal to the channel recommendation in the brief,
    // so the handoff copy must carry it too. Optional on the type, so guard.
    ...(brief.search_strategy
      ? [
          `## 검색 / 키워드 전략`,
          `추천 키워드: ${brief.search_strategy.recommended_keywords.join(", ")}`,
          `제목 방향: ${brief.search_strategy.seo_title_direction}`,
          `소제목(H2/H3) 키워드: ${brief.search_strategy.subheading_keywords.join(", ")}`,
          `검색 의도: ${brief.search_strategy.target_search_intent}`,
          `의사결정자 적합성: ${brief.search_strategy.decision_maker_fit}`,
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
    `## 출처`,
    ...brief.sources.map(
      (s) => `- [${s.type}] ${s.label}${s.detail ? ` — ${s.detail}` : ""}`
    ),
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
      await navigator.clipboard.writeText(briefToPlainText(brief));
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
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {s.relevance_score !== null &&
                        `관련도 ${Math.round(s.relevance_score * 100)}%`}
                      {s.source ? ` · ${s.source}` : ""}
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

      <Step n={4} title="Human Decision — 승인 / 반려" active={!!brief && !decision} done={!!decision}>
        {!brief ? (
          <p className="text-sm text-neutral-400 italic">
            Brief가 생성되면 위 카드에서 승인 또는 반려할 수 있어요.
          </p>
        ) : !decision ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Brief 카드의 승인 / 반려 버튼으로 판단해주세요. 최종 결정은 사람이 합니다.
          </p>
        ) : decision === "rejected" ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            반려했습니다. 다른 신호를 선택해 다시 검토해보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-neutral-700 dark:text-neutral-200">
              승인했습니다. 이 Brief를 그대로 글쓰기 도구에 넘기면 됩니다.
            </p>
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
              복사한 Brief를 ChatGPT, Claude 등 기존 글쓰기 도구에 붙여넣어 초안을
              작성하세요. Ganache는 여기까지 — 초안 작성은 기존 도구를 그대로
              쓰시면 됩니다.
            </p>
          </div>
        )}
      </Step>
    </div>
  );
}
