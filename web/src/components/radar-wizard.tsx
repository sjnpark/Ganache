"use client";

import { useState, useTransition } from "react";
import { analyzeOpportunityAction, generateIdeasAction } from "@/app/radar/actions";
import { CHANNEL_OPTIONS, type Idea, type Opportunity, type Trend } from "@/lib/types";

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

export function RadarWizard({ signals }: { signals: Trend[] }) {
  const [signal, setSignal] = useState<Trend | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickSignal(s: Trend) {
    setError(null);
    setSignal(s);
    setOpportunity(null);
    setChannel(null);
    setIdeas(null);
    startTransition(async () => {
      try {
        const result = await analyzeOpportunityAction(s.id);
        setOpportunity(result.opportunity);
      } catch (e) {
        setError(e instanceof Error ? e.message : "기회 분석에 실패했어요.");
      }
    });
  }

  function pickChannel(id: string) {
    if (!signal || !opportunity) return;
    setError(null);
    setChannel(id);
    setIdeas(null);
    startTransition(async () => {
      try {
        const result = await generateIdeasAction({
          signalId: signal.id,
          opportunity,
          channel: id,
        });
        setIdeas(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "아이디어 생성에 실패했어요.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-2">
          {error}
        </p>
      )}

      {/* Step 1 — Weekly Radar */}
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

      {/* Step 2 — Opportunity */}
      <Step
        n={2}
        title="Opportunity — 왜 지금 우리에게 기회인가"
        active={!!signal && !channel}
        done={!!opportunity && !!channel}
      >
        {!signal ? (
          <p className="text-sm text-neutral-400 italic">위에서 신호를 먼저 선택하세요.</p>
        ) : !opportunity ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {pending ? "기회를 분석하는 중이에요..." : "분석 결과를 기다리는 중이에요."}
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">{opportunity.headline}</p>
            <p className="text-neutral-600 dark:text-neutral-300">
              <span className="font-medium">왜 지금: </span>
              {opportunity.why_now}
            </p>
            <p className="text-neutral-600 dark:text-neutral-300">
              <span className="font-medium">잡아야 할 각도: </span>
              {opportunity.angle}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">
              <span className="font-medium">대상: </span>
              {opportunity.target_audience}
            </p>
            <p className="text-xs rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1.5">
              ⚠ 확인 필요: {opportunity.risk}
            </p>
          </div>
        )}
      </Step>

      {/* Step 3 — Channel */}
      <Step n={3} title="Channel — 어디에 낼 것인가" active={!!opportunity && !ideas} done={!!channel}>
        {!opportunity ? (
          <p className="text-sm text-neutral-400 italic">기회 분석이 끝나면 선택할 수 있어요.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CHANNEL_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickChannel(c.id)}
                disabled={pending}
                className={`rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                  channel === c.id
                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800"
                    : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {c.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      </Step>

      {/* Step 4 — Ideas */}
      <Step n={4} title="Next Content Idea" active={!!channel} done={!!ideas}>
        {!channel ? (
          <p className="text-sm text-neutral-400 italic">채널을 선택하면 아이디어가 생성돼요.</p>
        ) : !ideas ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {pending ? "아이디어를 생성하는 중이에요... (몇 초 걸려요)" : "결과를 기다리는 중이에요."}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {ideas.map((idea) => (
              <li
                key={idea.id}
                className="border-t border-neutral-100 dark:border-neutral-900 pt-3 first:border-t-0 first:pt-0 flex flex-col gap-1 text-sm"
              >
                <span className="font-medium">{idea.title}</span>
                {idea.description && (
                  <p className="text-neutral-600 dark:text-neutral-300">{idea.description}</p>
                )}
                {idea.rationale && (
                  <p className="text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium">근거: </span>
                    {idea.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Step>
    </div>
  );
}
