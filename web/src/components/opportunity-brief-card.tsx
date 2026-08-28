"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { OpportunityBrief } from "@/lib/opportunity-brief-types";

// The success-metrics section was removed from this card (the KPI is already
// fixed by the brief itself), so the SuccessMetricCategory label map that
// rendered it is gone too. `success_metrics` is still generated and still on
// the OpportunityBrief object — restoring the section means re-adding the
// label map and the block above the "내부 증거" divider.

type Decision = "approved" | "rejected" | null;

// Pure presentation + a small "Human decision" affordance. State is local
// by default (uncontrolled) so this drops into any page with zero setup;
// pass onApprove/onReject if the host page (e.g. Seojin's Radar wizard)
// wants to react to the decision (persist it, advance a wizard step, etc).
// This component never fetches data or talks to Supabase itself — it only
// renders the OpportunityBrief it's given.
export function OpportunityBriefCard({
  brief,
  onApprove,
  onReject,
}: {
  brief: OpportunityBrief;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const [decision, setDecision] = useState<Decision>(null);

  function handleApprove() {
    setDecision("approved");
    onApprove?.();
  }

  function handleReject() {
    setDecision("rejected");
    onReject?.();
  }

  return (
    <Card
      title="Opportunity Brief"
      // brief.confidence is deliberately not shown here. It is the model's own
      // self-reported number with no measurable basis, so presenting it as a
      // percentage overstated how defensible it is. The field is still
      // generated and available on the object.
      action={
        <div className="flex items-center gap-2">
          {decision && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                decision === "approved"
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {decision === "approved" ? "승인됨" : "반려됨"}
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <p className="text-lg font-semibold">{brief.opportunity_title}</p>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            {brief.why_now}
          </p>
        </div>

        <p className="text-neutral-500 dark:text-neutral-400">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            타깃 오디언스:{" "}
          </span>
          {brief.recommended_target_audience}
        </p>

        {/* Channel and Search/Keyword strategy are peer sections — neither
            should visually dominate the other (Codepresso's inbound is
            70-80% search-driven, so keyword strategy matters as much as
            channel choice). Both use the same neutral highlight styling. */}
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-3 py-2.5">
          <p className="font-medium">
            ⭐ 추천 채널: {brief.recommended_channel.label}
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
            {brief.recommended_channel.reason}
          </p>
        </div>

        {brief.search_strategy && (
          <div className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-3 py-2.5">
            <p className="font-medium">🔍 검색/키워드 전략</p>
            <div className="mt-2 flex flex-col gap-2">
              {brief.search_strategy.recommended_keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    추천 키워드
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brief.search_strategy.recommended_keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {brief.search_strategy.seo_title_direction && (
                <p className="text-neutral-600 dark:text-neutral-300">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    제목 방향:{" "}
                  </span>
                  {brief.search_strategy.seo_title_direction}
                </p>
              )}
              {brief.search_strategy.subheading_keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    소제목(H2/H3) 키워드
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    {brief.search_strategy.subheading_keywords.join(" · ")}
                  </p>
                </div>
              )}
              {brief.search_strategy.target_search_intent && (
                <p className="text-neutral-600 dark:text-neutral-300">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    검색 의도:{" "}
                  </span>
                  {brief.search_strategy.target_search_intent}
                </p>
              )}
              {brief.search_strategy.decision_maker_fit && (
                <p className="text-neutral-600 dark:text-neutral-300">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    의사결정자 적합성:{" "}
                  </span>
                  {brief.search_strategy.decision_maker_fit}
                </p>
              )}
            </div>
          </div>
        )}

        {brief.alternative_channels.length > 0 && (
          <div>
            <p className="font-medium text-neutral-700 dark:text-neutral-200 mb-1.5">
              대안 채널
            </p>
            <ul className="flex flex-col gap-1.5">
              {brief.alternative_channels.map((c) => (
                <li
                  key={c.channel + c.label}
                  className="text-neutral-600 dark:text-neutral-300"
                >
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    {c.label}:
                  </span>{" "}
                  {c.suggested_format_or_angle}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="font-medium text-neutral-700 dark:text-neutral-200">
            주요 콘텐츠 각도
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
            {brief.main_content_angle}
          </p>
        </div>

        {brief.talking_points.length > 0 && (
          <div>
            <p className="font-medium text-neutral-700 dark:text-neutral-200 mb-1">
              핵심 talking points
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300">
              {brief.talking_points.map((tp, i) => (
                <li key={i}>{tp}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-neutral-500 dark:text-neutral-400">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            추천 마케팅 액션 / CTA:{" "}
          </span>
          {brief.recommended_marketing_action}
        </p>

        {/* The success-metrics section is deliberately not shown. The KPI is
            already fixed by the brief (qualified B2B inquiries), so restating
            suggested metrics per brief added length without adding a decision
            the reader actually has to make. success_metrics is still generated
            and available on the object. */}

        <div className="border-t border-neutral-100 dark:border-neutral-900 pt-3">
          <p className="font-medium text-neutral-700 dark:text-neutral-200 mb-1">
            내부 증거
          </p>
          {brief.has_internal_evidence ? (
            <ul className="flex flex-col gap-1">
              {brief.internal_evidence.map((ev) => (
                <li
                  key={ev.content_id}
                  className="text-xs text-neutral-500 dark:text-neutral-400"
                >
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Qualified Leads {ev.qualified_leads}
                  </span>{" "}
                  — {ev.content_title} ({ev.channel})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              내부 증거 없음 — 검증 필요
            </p>
          )}
        </div>

        <div>
          <p className="font-medium text-neutral-700 dark:text-neutral-200 mb-1">
            출처
          </p>
          <ul className="flex flex-col gap-0.5">
            {brief.sources.map((s, i) => (
              <li key={i} className="text-xs text-neutral-400 dark:text-neutral-500">
                [{s.type === "external" ? "외부" : "내부"}] {s.label}
                {s.detail ? ` — ${s.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={decision === "approved"}
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
          >
            승인
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={decision === "rejected"}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
          >
            반려
          </button>
        </div>
      </div>
    </Card>
  );
}
