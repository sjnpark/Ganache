// Integration layer for the Opportunity flow (Seojin).
//
// This file deliberately contains NO opportunity or brief logic of its own:
//   - Opportunity Candidate / evidence / tier / validation  -> Yeonwoo, lib/insights-data.ts
//   - Opportunity Brief generation                          -> Ahyoung, lib/opportunity-brief.ts
// It only joins them and adapts field names at the boundary.
//
// Signal identity contract: a Radar signal (Trend.id) and an
// OpportunityCandidate (candidate.id === candidate.signal.trend_id) are both
// the Supabase `trends` primary key, so they are matched by exact UUID —
// never by title or fuzzy matching.

import { getInsightsOverview } from "./insights-data";
import { getRadar } from "./radar-agent";
import { generateOpportunityBrief } from "./opportunity-brief";
import type { OpportunityBrief } from "./opportunity-brief-types";
import type { BusinessContext, OpportunityCandidate, Trend } from "./types";

export type RadarPageData = {
  companyContext: BusinessContext | null;
  signals: Trend[];
  candidates: OpportunityCandidate[];
};

export async function getRadarPageData(): Promise<RadarPageData> {
  const [{ companyContext, signals }, overview] = await Promise.all([
    getRadar(),
    getInsightsOverview(),
  ]);

  return { companyContext, signals, candidates: overview.opportunities };
}

export async function buildBriefForCandidate(
  candidateId: string
): Promise<OpportunityBrief> {
  const [{ companyContext }, overview] = await Promise.all([
    getRadar(),
    getInsightsOverview(),
  ]);

  const candidate = overview.opportunities.find((c) => c.id === candidateId);
  if (!candidate) {
    throw new Error(`No Opportunity Candidate found for trend ${candidateId}.`);
  }

  return generateOpportunityBrief({
    // Only field renaming here — trend_title -> title. Everything else is
    // already structurally identical between the two modules.
    signal: {
      title: candidate.signal.trend_title,
      summary: candidate.signal.summary,
      source: candidate.signal.source,
      relevance_score: candidate.signal.relevance_score,
      tags: candidate.signal.tags,
    },
    // Passed through unchanged: Yeonwoo's OpportunityEvidenceItem and
    // Ahyoung's OpportunityBriefEvidenceItem have identical fields. An empty
    // array is meaningful — the brief then states that no internal evidence
    // exists rather than inventing one.
    internalEvidence: candidate.evidence,
    businessContext: companyContext,
  });
}
