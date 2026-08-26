"use server";

import { buildBriefForCandidate } from "@/lib/opportunity-flow";
import type { OpportunityBrief } from "@/lib/opportunity-brief-types";

// Production flow: Radar signal -> Yeonwoo's Opportunity Candidate ->
// Ahyoung's Opportunity Brief -> human decision.
export async function generateBriefAction(
  candidateId: string
): Promise<OpportunityBrief> {
  return buildBriefForCandidate(candidateId);
}

// ---------------------------------------------------------------------------
// Superseded (kept for rollback only — NOT used by the production flow).
//
// The old flow generated an Opportunity with an LLM and then went straight on
// to channel selection and content-idea drafting. Per CLAUDE.md Section 3.1
// the Opportunity is now Yeonwoo's evidence-backed OpportunityCandidate, and
// drafting is out of MVP scope. `lib/radar-agent.ts` still holds the
// implementation; delete both once this integration is verified.
//
// export async function analyzeOpportunityAction(signalId: string) { ... }
// export async function generateIdeasAction(params) { ... }
// ---------------------------------------------------------------------------
