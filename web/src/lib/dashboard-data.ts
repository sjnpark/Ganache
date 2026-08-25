import { createSupabaseServerClient } from "./supabase-server";
import type { ContentPipelineRow, Trend } from "./types";

export type DashboardData = {
  trends: Trend[];
  pipeline: ContentPipelineRow[];
  topPerforming: ContentPipelineRow[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();

  const [trendsRes, pipelineRes] = await Promise.all([
    supabase
      .from("trends")
      .select("*")
      .order("collected_at", { ascending: false })
      .limit(5),
    supabase.from("content_pipeline_overview").select("*"),
  ]);

  if (trendsRes.error) throw trendsRes.error;
  if (pipelineRes.error) throw pipelineRes.error;

  const pipeline = (pipelineRes.data ?? []) as ContentPipelineRow[];
  const topPerforming = [...pipeline]
    .filter((row) => row.leads !== null)
    .sort((a, b) => (b.leads ?? 0) - (a.leads ?? 0))
    .slice(0, 5);

  return {
    trends: (trendsRes.data ?? []) as Trend[],
    pipeline,
    topPerforming,
  };
}
