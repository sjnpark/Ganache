"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Marks rows created by the demo/mock connector, using only existing columns
// (content_metrics.extra_metrics JSONB, lead_events.attribution_source TEXT) —
// no schema change. Used both as a human-readable label and as the
// duplicate-prevention key: a content is only "collected" once, ever.
const DEMO_SOURCE_TAG = "demo_connector";

export async function collectDemoPerformanceAction() {
  const supabase = createSupabaseServerClient();

  const { data: existingMetrics, error: existingMetricsError } = await supabase
    .from("content_metrics")
    .select("content_id, extra_metrics");
  if (existingMetricsError) throw existingMetricsError;

  const alreadyCollected = new Set(
    (existingMetrics ?? [])
      .filter(
        (m) =>
          (m.extra_metrics as Record<string, unknown> | null)?.source ===
          DEMO_SOURCE_TAG
      )
      .map((m) => m.content_id as string)
  );

  const { data: contents, error: contentsError } = await supabase
    .from("contents")
    .select("id, title, channel")
    .order("created_at", { ascending: true });
  if (contentsError) throw contentsError;

  const target = (contents ?? []).find((c) => !alreadyCollected.has(c.id));

  if (!target) {
    redirect("/performance?collected=none");
  }

  const { data: latest, error: latestError } = await supabase
    .from("content_latest_metrics")
    .select("views, clicks, leads")
    .eq("content_id", target.id)
    .maybeSingle();
  if (latestError) throw latestError;

  const nextViews = (latest?.views ?? 0) + 150;
  const nextClicks = (latest?.clicks ?? 0) + 12;
  const nextLeads = (latest?.leads ?? 0) + 1;

  const { error: metricsInsertError } = await supabase
    .from("content_metrics")
    .insert({
      content_id: target.id,
      views: nextViews,
      clicks: nextClicks,
      leads: nextLeads,
      extra_metrics: {
        source: DEMO_SOURCE_TAG,
        note: "Mock data — no real external marketing API connected.",
      },
    });
  if (metricsInsertError) throw metricsInsertError;

  const { error: leadInsertError } = await supabase.from("lead_events").insert({
    content_id: target.id,
    channel: target.channel,
    inquiry_type: "contact_form",
    qualified: true,
    attribution_source: DEMO_SOURCE_TAG,
  });
  if (leadInsertError) throw leadInsertError;

  revalidatePath("/performance");
  redirect(`/performance?collected=1&target=${encodeURIComponent(target.title)}`);
}
