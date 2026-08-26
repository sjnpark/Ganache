"use server";

import { analyzeOpportunity, generateIdeasForOpportunity } from "@/lib/radar-agent";
import type { Idea, Opportunity, Trend } from "@/lib/types";

export async function analyzeOpportunityAction(
  signalId: string
): Promise<{ signal: Trend; opportunity: Opportunity }> {
  return analyzeOpportunity(signalId);
}

export async function generateIdeasAction(params: {
  signalId: string;
  opportunity: Opportunity;
  channel: string;
}): Promise<Idea[]> {
  return generateIdeasForOpportunity(params);
}
