import { getIdeas } from "@/lib/idea-agent";
import { Card, EmptyState, NavBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { generateIdeasAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  proposed: "제안됨",
  selected: "채택됨",
  in_progress: "진행중",
  converted: "콘텐츠화됨",
  rejected: "반려됨",
};

export default async function IdeasPage() {
  const ideas = await getIdeas();

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">아이디어 (Stage 1)</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            지난 7일 성과 + 최근 트렌드를 참고해 AI가 콘텐츠 아이디어를 제안해요.
          </p>
        </div>
        <NavBar />
      </header>

      <form action={generateIdeasAction}>
        <SubmitButton label="새 아이디어 생성" pendingLabel="생성 중... (몇 초 걸려요)" />
      </form>

      <Card title={`아이디어 목록 (${ideas.length})`}>
        {ideas.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {ideas.map((idea) => (
              <li
                key={idea.id}
                className="border-t border-neutral-100 dark:border-neutral-900 pt-4 first:border-t-0 first:pt-0 flex flex-col gap-1.5 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{idea.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                    {STATUS_LABEL[idea.status] ?? idea.status}
                  </span>
                </div>
                {idea.description && (
                  <p className="text-neutral-600 dark:text-neutral-300">
                    {idea.description}
                  </p>
                )}
                {idea.rationale && (
                  <p className="text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium">근거: </span>
                    {idea.rationale}
                  </p>
                )}
                <p className="text-xs text-neutral-400">
                  채널: {idea.recommended_channel ?? "-"} · 타깃:{" "}
                  {idea.target_audience ?? "-"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="아직 생성된 아이디어가 없어요. 위 버튼을 눌러보세요." />
        )}
      </Card>
    </main>
  );
}
