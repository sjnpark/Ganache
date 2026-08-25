"use server";

import { revalidatePath } from "next/cache";
import { summarizeAndSavePlanningSession } from "@/lib/planning-agent";

export async function createPlanningSessionAction(formData: FormData) {
  const weekOf = (formData.get("week_of") as string) || new Date().toISOString().slice(0, 10);
  const transcript = (formData.get("transcript") as string)?.trim();

  if (!transcript) return;

  await summarizeAndSavePlanningSession(weekOf, transcript);
  revalidatePath("/planning");
}
