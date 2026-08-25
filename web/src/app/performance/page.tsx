import { getPerformanceOverview } from "@/lib/performance-data";

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

function QualifiedBadge({ qualified }: { qualified: boolean }) {
  return qualified ? (
    <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5">
      Qualified
    </span>
  ) : (
    <span className="inline-block rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs px-2 py-0.5">
      Unqualified
    </span>
  );
}

export default async function PerformancePage() {
  const { metrics, leads, qualifiedLeadCount } = await getPerformanceOverview();

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">성과 / 리드 (Stage 7)</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Performance Collection &amp; Lead Tracking — 현재는 조회 전용 화면입니다.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          핵심 KPI
        </h2>
        <p className="mt-2 text-3xl font-bold">{qualifiedLeadCount}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Qualified B2B Leads (lead_events.qualified = true 기준 — 조회수나
          content_metrics.leads 집계가 아니라, 실제 개별 문의 건수를 KPI 기준으로
          삼습니다.)
        </p>
      </section>

      <Card title="최근 성과 스냅샷 (content_latest_metrics)">
        {metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">콘텐츠</th>
                  <th className="py-2 pr-4 font-medium">채널</th>
                  <th className="py-2 pr-4 font-medium">조회수</th>
                  <th className="py-2 pr-4 font-medium">리드(집계, 참고용)</th>
                  <th className="py-2 pr-4 font-medium">전환율</th>
                  <th className="py-2 pr-4 font-medium">수집 시각</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row) => (
                  <tr
                    key={row.content_id}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4">{row.content_title ?? "—"}</td>
                    <td className="py-2 pr-4">{row.channel ?? "—"}</td>
                    <td className="py-2 pr-4">{row.views}</td>
                    <td className="py-2 pr-4">{row.leads}</td>
                    <td className="py-2 pr-4">
                      {row.conversion_rate !== null
                        ? `${(row.conversion_rate * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {new Date(row.collected_at).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="아직 수집된 성과 스냅샷이 없어요." />
        )}
      </Card>

      <Card title="최근 리드 (lead_events)">
        {leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">콘텐츠</th>
                  <th className="py-2 pr-4 font-medium">채널</th>
                  <th className="py-2 pr-4 font-medium">문의 유형</th>
                  <th className="py-2 pr-4 font-medium">Qualified</th>
                  <th className="py-2 pr-4 font-medium">유입 경로</th>
                  <th className="py-2 pr-4 font-medium">발생 시각</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4">{row.content_title ?? "—"}</td>
                    <td className="py-2 pr-4">{row.channel ?? "—"}</td>
                    <td className="py-2 pr-4">{row.inquiry_type}</td>
                    <td className="py-2 pr-4">
                      <QualifiedBadge qualified={row.qualified} />
                    </td>
                    <td className="py-2 pr-4">{row.attribution_source ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {new Date(row.created_at).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="아직 등록된 리드가 없어요." />
        )}
      </Card>
    </main>
  );
}
