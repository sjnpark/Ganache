import { getRadar } from "@/lib/radar-agent";
import { NavBar } from "@/components/ui";
import { RadarWizard } from "@/components/radar-wizard";

export default async function RadarPage() {
  const { companyContext, signals } = await getRadar();

  return (
    <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ganache</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            시장 신호를 {companyContext?.company_name ?? "우리 회사"}의 다음 콘텐츠로 —
            물어보기 전에 먼저 제안합니다.
          </p>
        </div>
        <NavBar />
      </header>

      {!companyContext && (
        <p className="text-sm rounded-md border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-2">
          회사 컨텍스트가 아직 등록되지 않았어요. 등록 전에는 일반적인 결과가 나올 수 있어요.
        </p>
      )}

      <RadarWizard signals={signals} />
    </main>
  );
}
