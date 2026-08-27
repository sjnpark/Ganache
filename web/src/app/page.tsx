import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/dashboard-data";
import { Card, EmptyState, NavBar } from "@/components/ui";

// Read live from Supabase on every request (see /radar for why).
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  approved: "승인됨",
  published: "발행됨",
  rejected: "반려됨",
  archived: "보관됨",
};

export default async function Home() {
  // Final-demo cleanup: "/" now sends visitors straight to /radar. The
  // legacy dashboard below is intentionally left in place (not deleted) —
  // it stays reachable if this redirect is ever removed.
  redirect("/radar");

  const { trends, pipeline, topPerforming } = await getDashboardData();

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ganache</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Codepresso 마케팅 자동화 — 시작 화면
          </p>
        </div>
        <NavBar />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Current Trends / Issues">
          {trends.length > 0 ? (
            <ul className="flex flex-col gap-3 text-sm">
              {trends.map((trend) => (
                <li key={trend.id} className="flex flex-col gap-0.5">
                  <span className="font-medium">{trend.title}</span>
                  {trend.relevance_score !== null && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      관련도 {Math.round(trend.relevance_score * 100)}%
                      {trend.source ? ` · ${trend.source}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="아직 등록된 트렌드/이슈가 없어요." />
          )}
        </Card>

        <Card title="Past Performance (Top Leads)">
          {topPerforming.length > 0 ? (
            <ul className="flex flex-col gap-3 text-sm">
              {topPerforming.map((row) => (
                <li key={row.id} className="flex flex-col gap-0.5">
                  <span className="font-medium">{row.title}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    조회수 {row.views ?? 0} · 리드 {row.leads ?? 0}
                    {row.conversion_rate !== null &&
                      ` · 전환율 ${(row.conversion_rate * 100).toFixed(1)}%`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="아직 수집된 성과 데이터가 없어요." />
          )}
        </Card>
      </div>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-4">
          Content Pipeline
        </h2>
        {pipeline.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">제목</th>
                  <th className="py-2 pr-4 font-medium">채널</th>
                  <th className="py-2 pr-4 font-medium">상태</th>
                  <th className="py-2 pr-4 font-medium">리뷰</th>
                  <th className="py-2 pr-4 font-medium">조회수</th>
                  <th className="py-2 pr-4 font-medium">리드</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4">{row.title}</td>
                    <td className="py-2 pr-4">{row.channel}</td>
                    <td className="py-2 pr-4">
                      {STATUS_LABEL[row.status] ?? row.status}
                    </td>
                    <td className="py-2 pr-4">
                      {row.latest_review_status ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{row.views ?? "—"}</td>
                    <td className="py-2 pr-4">{row.leads ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="아직 등록된 콘텐츠가 없어요. Supabase에 예시 데이터를 넣으면 여기 표시돼요." />
        )}
      </section>
    </main>
  );
}
