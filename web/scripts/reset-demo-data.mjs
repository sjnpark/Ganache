/**
 * Builderthon demo/rehearsal reset utility.
 *
 * Purpose: before a rehearsal or the final presentation, this restores the
 * shared Supabase demo data to its original seeded state by deleting ONLY
 * the rows created by the Stage 7 "Collect Performance (Demo)" mock
 * connector (see web/src/app/performance/actions.ts).
 *
 * Scope — and nothing else, ever:
 *   - content_metrics WHERE extra_metrics->>'source' = 'demo_connector'
 *   - lead_events     WHERE attribution_source      = 'demo_connector'
 *
 * This script never reads or writes contents, ideas, content_insights,
 * insight_sources, idea_insights, content_reviews, content_publications,
 * trends, business_context, channels, planning_sessions, or any other
 * table/column. It only ever touches the two exact filters above.
 *
 * Safety: this is a TEAM-SHARED Supabase project. Running with no flags is
 * a dry-run — it only PREVIEWS what would be deleted and deletes nothing.
 * Nothing is ever deleted unless you pass --yes explicitly.
 *
 * Usage (from the web/ directory):
 *   node scripts/reset-demo-data.mjs           # dry-run (preview only)
 *   node scripts/reset-demo-data.mjs --yes     # actually delete
 *
 * Or via npm (see package.json):
 *   npm run demo:reset
 *   npm run demo:reset -- --yes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEMO_SOURCE_TAG = "demo_connector";
const shouldDelete = process.argv.includes("--yes");

// Load web/.env.local manually so this script needs no extra dependency and
// works regardless of the current working directory. Never logs values.
function loadEnvLocal() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(dir, "..", ".env.local");
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check web/.env.local."
    );
    process.exit(1);
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function main() {
  loadEnvLocal();
  const supabase = getClient();

  const { data: demoMetrics, error: metricsErr } = await supabase
    .from("content_metrics")
    .select("id, content_id, views, clicks, leads, collected_at, extra_metrics")
    .filter("extra_metrics->>source", "eq", DEMO_SOURCE_TAG);
  if (metricsErr) throw metricsErr;

  const { data: demoLeads, error: leadsErr } = await supabase
    .from("lead_events")
    .select("id, content_id, channel, qualified, created_at")
    .eq("attribution_source", DEMO_SOURCE_TAG);
  if (leadsErr) throw leadsErr;

  const contentIds = [
    ...new Set(
      [...demoMetrics.map((m) => m.content_id), ...demoLeads.map((l) => l.content_id)].filter(
        Boolean
      )
    ),
  ];

  let titleById = new Map();
  if (contentIds.length > 0) {
    const { data: contents, error: contentsErr } = await supabase
      .from("contents")
      .select("id, title")
      .in("id", contentIds);
    if (contentsErr) throw contentsErr;
    titleById = new Map(contents.map((c) => [c.id, c.title]));
  }

  console.log("=== Builderthon Demo Reset — Preview ===");
  console.log(
    shouldDelete
      ? "Mode: DELETE (--yes given)"
      : "Mode: DRY-RUN (no --yes — nothing will be deleted)"
  );
  console.log("");
  console.log(`content_metrics rows tagged '${DEMO_SOURCE_TAG}': ${demoMetrics.length}`);
  for (const m of demoMetrics) {
    console.log(
      `  - ${titleById.get(m.content_id) ?? m.content_id} | views=${m.views} clicks=${m.clicks} leads=${m.leads} | collected_at=${m.collected_at}`
    );
  }
  console.log("");
  console.log(`lead_events rows tagged '${DEMO_SOURCE_TAG}': ${demoLeads.length}`);
  for (const l of demoLeads) {
    console.log(
      `  - ${titleById.get(l.content_id) ?? l.content_id ?? "(no content)"} | channel=${l.channel} qualified=${l.qualified} | created_at=${l.created_at}`
    );
  }
  console.log("");

  if (demoMetrics.length === 0 && demoLeads.length === 0) {
    console.log("Nothing to reset — no demo_connector rows found. Already at seed state.");
    return;
  }

  if (!shouldDelete) {
    console.log("Dry-run only — no rows were deleted.");
    console.log("Re-run with --yes to actually delete the rows listed above.");
    return;
  }

  console.log("Deleting demo_connector rows...");

  const { error: delMetricsErr } = await supabase
    .from("content_metrics")
    .delete()
    .filter("extra_metrics->>source", "eq", DEMO_SOURCE_TAG);
  if (delMetricsErr) throw delMetricsErr;

  const { error: delLeadsErr } = await supabase
    .from("lead_events")
    .delete()
    .eq("attribution_source", DEMO_SOURCE_TAG);
  if (delLeadsErr) throw delLeadsErr;

  const { count: remainingMetrics, error: remMetricsErr } = await supabase
    .from("content_metrics")
    .select("*", { count: "exact", head: true })
    .filter("extra_metrics->>source", "eq", DEMO_SOURCE_TAG);
  if (remMetricsErr) throw remMetricsErr;

  const { count: remainingLeads, error: remLeadsErr } = await supabase
    .from("lead_events")
    .select("*", { count: "exact", head: true })
    .eq("attribution_source", DEMO_SOURCE_TAG);
  if (remLeadsErr) throw remLeadsErr;

  const { data: allLeads, error: allLeadsErr } = await supabase
    .from("lead_events")
    .select("qualified");
  if (allLeadsErr) throw allLeadsErr;
  const qualifiedCount = (allLeads ?? []).filter((l) => l.qualified).length;

  console.log("");
  console.log("=== After reset ===");
  console.log(`Remaining demo_connector content_metrics rows: ${remainingMetrics}`);
  console.log(`Remaining demo_connector lead_events rows: ${remainingLeads}`);
  console.log(`Current Qualified B2B Lead count (lead_events.qualified = true): ${qualifiedCount}`);

  if (remainingMetrics === 0 && remainingLeads === 0) {
    console.log("Reset complete — demo data restored to seed state.");
  } else {
    console.warn("Warning: some demo_connector rows still remain. Please investigate.");
  }
}

main().catch((err) => {
  console.error("Reset script failed:", err.message ?? err);
  process.exit(1);
});
