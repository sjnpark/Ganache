import { createSupabaseServerClient } from "./supabase-server";
import { generateText } from "./gemini";
import type { PlanningSession } from "./types";

export async function summarizeAndSavePlanningSession(
  weekOf: string,
  transcript: string
): Promise<PlanningSession> {
  const supabase = createSupabaseServerClient();

  const instruction = `
당신은 Codepresso 마케팅팀의 주간 기획 회의록을 정리하는 도우미입니다.
아래 회의 스크립트를 읽고 다음 항목으로 정리하세요:

- 이번 주 주요 콘텐츠 주제
- 채널별 계획
- 일정/마감
- 결정된 사항 (언급된 경우, 담당자 포함)

회의에 없는 내용을 추측해서 채우지 마세요. 언급되지 않은 항목은 "언급 없음"이라고 쓰세요.
자연스러운 한국어로, 마크다운 소제목(##)을 사용해 정리하세요.
`.trim();

  const summary = await generateText({ instruction, content: transcript });

  const { data, error } = await supabase
    .from("planning_sessions")
    .insert({ week_of: weekOf, transcript, summary })
    .select()
    .single();

  if (error) throw error;
  return data as PlanningSession;
}

export async function getPlanningSessions(): Promise<PlanningSession[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("planning_sessions")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as PlanningSession[];
}
