import { getInsightsOverview } from "@/lib/insights-data";

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
      {message}
    </p>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  "content-level": "콘텐츠 단위",
  "topic-level": "주제 단위",
  "channel-level": "채널 단위",
  "audience-level": "타깃 단위",
  general: "일반",
};

export default async function InsightsPage() {
  const {
    insights,
    qualifiedLeadCount,
    totalLeadCount,
    totalViews,
    totalClicks,
    byContent,
    byChannel,
  } = await getInsightsOverview();

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">인사이트 (Stage 8)</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Data Accumulation &amp; Insight — 현재는 조회 전용 화면입니다. 아직
          새 insight/아이디어를 생성하거나 DB에 쓰지 않습니다.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            핵심 KPI
          </p>
          <p className="mt-1 text-5xl font-bold text-emerald-700 dark:text-emerald-300">
            {qualifiedLeadCount}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Qualified B2B Leads (lead_events.qualified = true) — 조회수가
            아니라 이 숫자가 진짜 성과 지표입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <span>참고용 · 전체 조회수(Views): {totalViews.toLocaleString()}</span>
          <span>참고용 · 전체 클릭(Clicks): {totalClicks.toLocaleString()}</span>
          <span>참고용 · 전체 문의(모든 리드): {totalLeadCount}건</span>
        </div>
      </section>

      <Card title="채널별 Qualified Lead 요약">
        {byChannel.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">채널</th>
                  <th className="py-2 pr-4 font-medium text-emerald-600 dark:text-emerald-400">
                    Qualified Leads
                  </th>
                  <th className="py-2 pr-4 font-medium">전체 문의</th>
                  <th className="py-2 pr-4 font-medium text-neutral-400 dark:text-neutral-500">
                    조회수 (참고용)
                  </th>
                </tr>
              </thead>
              <tbody>
                {byChannel.map((row) => (
                  <tr
                    key={row.channel}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4">{row.channel}</td>
                    <td className="py-2 pr-4 font-bold text-emerald-700 dark:text-emerald-300">
                      {row.qualified_leads}
                    </td>
                    <td className="py-2 pr-4">{row.total_leads}</td>
                    <td className="py-2 pr-4 text-neutral-400 dark:text-neutral-500">
                      {row.views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="아직 리드 데이터가 없어요." />
        )}
      </Card>

      <Card title="콘텐츠별 성과 비교 (Qualified Leads 기준 정렬)">
        {byContent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">콘텐츠</th>
                  <th className="py-2 pr-4 font-medium">채널</th>
                  <th className="py-2 pr-4 font-medium text-emerald-600 dark:text-emerald-400">
                    Qualified Leads
                  </th>
                  <th className="py-2 pr-4 font-medium">전체 문의</th>
                  <th className="py-2 pr-4 font-medium text-neutral-400 dark:text-neutral-500">
                    조회수 (참고용)
                  </th>
                  <th className="py-2 pr-4 font-medium text-neutral-400 dark:text-neutral-500">
                    클릭 (참고용)
                  </th>
                </tr>
              </thead>
              <tbody>
                {byContent.map((row) => (
                  <tr
                    key={row.content_id}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4">{row.content_title}</td>
                    <td className="py-2 pr-4">{row.channel}</td>
                    <td className="py-2 pr-4 font-bold text-emerald-700 dark:text-emerald-300">
                      {row.qualified_leads}
                    </td>
                    <td className="py-2 pr-4">{row.total_leads}</td>
                    <td className="py-2 pr-4 text-neutral-400 dark:text-neutral-500">
                      {row.views.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-neutral-400 dark:text-neutral-500">
                      {row.clicks ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="아직 콘텐츠 성과 데이터가 없어요." />
        )}
      </Card>

      <Card title="현재 등록된 Insight (content_insights)">
        {insights.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="border border-neutral-100 dark:border-neutral-800 rounded-md p-4 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-2 py-0.5">
                    {INSIGHT_TYPE_LABEL[insight.insight_type] ?? insight.insight_type}
                  </span>
                  {insight.confidence !== null && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      확신도 {Math.round(insight.confidence * 100)}%
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(insight.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm">{insight.insight_text}</p>
                {insight.content_title && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    근거 콘텐츠 예시: {insight.content_title}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="아직 등록된 insight가 없어요." />
        )}
      </Card>
    </main>
  );
}
