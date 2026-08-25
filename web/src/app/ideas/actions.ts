"use server";

import { revalidatePath } from "next/cache";
import { generateIdeasFromContext } from "@/lib/idea-agent";

export async function generateIdeasAction() {
  await generateIdeasFromContext();
  revalidatePath("/ideas");
}
