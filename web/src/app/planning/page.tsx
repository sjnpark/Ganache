import { getPlanningSessions } from "@/lib/planning-agent";

// Read live from Supabase on every request (see /radar for why).
export const dynamic = "force-dynamic";

import { Card, EmptyState, NavBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createPlanningSessionAction } from "./actions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PlanningPage() {
  const sessions = await getPlanningSessions();

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">기획 (Stage 2)</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            주간 기획 회의 스크립트를 붙여넣으면 AI가 자동으로 요약해요.
          </p>
        </div>
        <NavBar />
      </header>

      <Card title="새 기획 회의 요약하기">
        <form action={createPlanningSessionAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">
              회의 주차 (해당 주 월요일)
            </span>
            <input
              type="date"
              name="week_of"
              defaultValue={today()}
              className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">
              회의 스크립트 (회의록 도구에서 복사해서 붙여넣으세요)
            </span>
            <textarea
              name="transcript"
              required
              rows={8}
              placeholder="예: 이번 주는 AI 역량진단 관련 블로그 1건, LinkedIn 2건 올리기로 함. 마감은 금요일..."
              className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-sm"
            />
          </label>
          <div>
            <SubmitButton label="요약 생성" pendingLabel="요약 중..." />
          </div>
        </form>
      </Card>

      <Card title={`기획 세션 기록 (${sessions.length})`}>
        {sessions.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="border-t border-neutral-100 dark:border-neutral-900 pt-4 first:border-t-0 first:pt-0 flex flex-col gap-2 text-sm"
              >
                <span className="font-medium">{session.week_of} 주간 기획</span>
                {session.summary && (
                  <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
                    {session.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="아직 기록된 기획 세션이 없어요." />
        )}
      </Card>
    </main>
  );
}
