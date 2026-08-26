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

const VALIDATION_STATE_LABEL: Record<string, string> = {
  supported: "Supported",
  partial_evidence: "Partial Evidence",
  validation_needed: "Validation Needed",
};

const VALIDATION_STATE_CLASS: Record<string, string> = {
  supported:
    "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
  partial_evidence:
    "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  validation_needed:
    "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
};

const EVIDENCE_TIER_LABEL: Record<string, string> = {
  downstream_business_outcome: "Downstream Business Outcome",
  qualified_b2b_inquiry: "Qualified B2B Inquiry",
  strong_engagement_outcome: "Strong Engagement Outcome",
  conversion_action: "Conversion Action",
  attention_only: "Attention Only",
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
    trends,
    opportunities,
  } = await getInsightsOverview();

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">인사이트 / Opportunity (Stage 8)</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Data Accumulation &amp; Opportunity Evidence — 현재는 조회 전용
          화면입니다. 아직 새 insight/아이디어를 생성하거나 DB에 쓰지
          않습니다. Opportunity Candidate는 <code>ideas</code> 테이블과
          무관하게, 화면을 그릴 때마다 계산되는 값입니다.
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

      <Card title="외부 시장 신호 (trends)">
        <p className="text-xs text-neutral-400 dark:text-neutral-500 -mt-1">
          시장 관심도 신호일 뿐입니다 — B2B 전환 증거가 아닙니다.
        </p>
        {trends.length > 0 ? (
          <ul className="flex flex-col gap-3 text-sm">
            {trends.map((trend) => (
              <li key={trend.id} className="flex flex-col gap-0.5">
                <span className="font-medium">{trend.title}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {trend.relevance_score !== null &&
                    `시장 관심도(참고용) ${Math.round(trend.relevance_score * 100)}% · `}
                  {trend.source}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  태그: {trend.tags.join(", ") || "없음"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="아직 등록된 외부 시장 신호가 없어요." />
        )}
      </Card>

      <Card title="[내부 증거] 채널별 Qualified Lead 요약">
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

      <Card title="[내부 증거] 콘텐츠별 성과 비교 (Qualified Leads 기준 정렬)">
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

      <Card title="계산된 Opportunity Candidate (Read-only)">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-1">
          ⚠️ 이건 확정된 추천이 아니라 사람이 검토해야 할{" "}
          <strong>후보(Candidate)</strong>입니다. 투명한 규칙 기반(태그
          매칭)으로 매번 화면을 그릴 때 계산되며, DB에 저장되지 않고{" "}
          <code>ideas</code>와도 무관합니다. 일반적인 단어(예: ai, enterprise,
          training) 하나만으로는 매칭하지 않고, 여러 팀의 trend에서 겹치지
          않는 복합 태그가 실제로 내부 콘텐츠/insight에 함께 등장할 때만
          매칭합니다.
        </p>
        {opportunities.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {opportunities.map((opp) => (
              <li
                key={opp.id}
                className="border border-neutral-100 dark:border-neutral-800 rounded-md p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-block rounded-full text-xs font-semibold px-2 py-0.5 ${VALIDATION_STATE_CLASS[opp.validation_state]}`}
                  >
                    {VALIDATION_STATE_LABEL[opp.validation_state]}
                  </span>
                  {opp.evidence_tier && (
                    <span className="inline-block rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs px-2 py-0.5">
                      {EVIDENCE_TIER_LABEL[opp.evidence_tier]}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    id: {opp.id}
                  </span>
                </div>

                <p className="text-sm">{opp.rationale}</p>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    외부 신호 (Signal)
                  </p>
                  <p className="text-sm font-medium">{opp.signal.trend_title}</p>
                  {opp.signal.summary && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {opp.signal.summary}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {opp.signal.relevance_score !== null &&
                      `시장 관심도(참고용) ${Math.round(opp.signal.relevance_score * 100)}% · `}
                    {opp.signal.source && `출처: ${opp.signal.source} · `}
                    태그: {opp.signal.tags.join(", ")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    매칭된 태그 (왜 연결됐는지)
                  </p>
                  {opp.matchedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {opp.matchedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      이 신호의 태그가 아직 내부 콘텐츠/insight와 겹치지
                      않았어요 (일반 단어 하나만으로는 매칭하지 않음)
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    내부 증거 (Internal Evidence)
                  </p>
                  {opp.hasInternalEvidence ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {opp.evidence.map((ev) => (
                        <li key={ev.content_id} className="text-sm">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            Qualified Leads {ev.qualified_leads}
                          </span>{" "}
                          — {ev.content_title} ({ev.channel})
                          {ev.insight_text && (
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                              근거 insight: “{ev.insight_text}”
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Internal evidence not yet available / validation
                      needed. (아직 내부 증거 없음 — 검토 필요)
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="외부 시장 신호가 없어 계산할 Opportunity Candidate가 없어요." />
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
