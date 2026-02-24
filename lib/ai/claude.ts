import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/ai/device";
import type { Exercise, MuscleGroup } from "@/types";
import type { QuotaInfo } from "@/stores/ai-store";

// Types
export interface WorkoutSummary {
  date: string;
  exercises: {
    name: string;
    primaryMuscle: MuscleGroup;
    sets: number;
  }[];
}

export interface SuggestedSet {
  reps: number;
  weight: number;
  isWarmup: boolean;
}

export interface SuggestedExercise {
  exerciseName: string;
  reason: string;
  sets: SuggestedSet[];
}

export interface SuggestedWorkout {
  name: string;
  reasoning: string;
  exercises: SuggestedExercise[];
}

export interface SuggestWorkoutParams {
  recentWorkouts: WorkoutSummary[];
  split: string;
  duration: number;
  availableExercises: Exercise[];
  energyLevel?: "energized" | "normal" | "tired";
  equipment?: "full_gym" | "home_gym" | "no_equipment";
}

export interface SuggestSplitParams {
  daysPerWeek: number;
  recentWorkouts: WorkoutSummary[];
  availableExercises: Exercise[];
  energyLevel?: "energized" | "normal" | "tired";
  equipment?: "full_gym" | "home_gym" | "no_equipment";
}

export interface SuggestedSplitDay {
  dayName: string;
  splitType: string;
  exercises: SuggestedExercise[];
}

export interface SuggestedSplitPlan {
  name: string;
  reasoning: string;
  days: SuggestedSplitDay[];
}

export interface AIResult<T> {
  data: T;
  quota: QuotaInfo;
}

// Thrown when the user has hit their monthly quota
export class QuotaExceededError extends Error {
  quota: QuotaInfo;
  constructor(quota: QuotaInfo) {
    super("Monthly AI suggestion limit reached");
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}

// ---------- Prompt builders (client-side, no secrets) ----------

function groupExercisesByMuscle(
  exercises: Exercise[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const ex of exercises) {
    const muscle = ex.primary_muscle;
    if (!grouped[muscle]) grouped[muscle] = [];
    grouped[muscle].push(ex.name);
  }
  return grouped;
}

function buildRecentWorkoutsSummary(workouts: WorkoutSummary[]): string {
  if (workouts.length === 0) {
    return "No recent workout history available. This is a beginner or returning user.";
  }
  return workouts
    .map((w, i) => {
      const exerciseList = w.exercises
        .map((e) => `${e.name} (${e.primaryMuscle}, ${e.sets} sets)`)
        .join(", ");
      return `${i + 1}. ${w.date}: ${exerciseList}`;
    })
    .join("\n");
}

function findRecentlyTrainedMuscles(workouts: WorkoutSummary[]): string[] {
  const muscleCounts: Record<string, number> = {};
  for (const w of workouts.slice(0, 3)) {
    for (const e of w.exercises) {
      muscleCounts[e.primaryMuscle] = (muscleCounts[e.primaryMuscle] || 0) + 1;
    }
  }
  return Object.keys(muscleCounts);
}

function buildWorkoutPrompt(params: SuggestWorkoutParams): string {
  const { recentWorkouts, split, duration, availableExercises, energyLevel, equipment } = params;
  const grouped = groupExercisesByMuscle(availableExercises);
  const recentSummary = buildRecentWorkoutsSummary(recentWorkouts);
  const recentMuscles = findRecentlyTrainedMuscles(recentWorkouts);
  const allMuscles = Object.keys(grouped);
  const undertrainedMuscles = allMuscles.filter((m) => !recentMuscles.includes(m));
  const exerciseListStr = Object.entries(grouped)
    .map(([muscle, names]) => `## ${muscle}\n${names.join(", ")}`)
    .join("\n\n");

  const contextLines: string[] = [];
  if (energyLevel) {
    const energyDesc = energyLevel === "energized" ? "high energy — push harder" : energyLevel === "tired" ? "low energy — keep it moderate/lighter" : "normal energy";
    contextLines.push(`User energy level: ${energyDesc}`);
  }
  if (equipment) {
    const equipDesc = equipment === "full_gym" ? "full gym with all equipment available" : equipment === "home_gym" ? "home gym (dumbbells, bodyweight)" : "no equipment (bodyweight only)";
    contextLines.push(`Available equipment: ${equipDesc}`);
  }

  return `Generate a ${split} workout for approximately ${duration} minutes.${contextLines.length > 0 ? `\n\n## Session Context\n${contextLines.join("\n")}` : ""}

## Recent Workout History (last ${recentWorkouts.length} workouts)
${recentSummary}

## Muscle Groups NOT Recently Trained
${undertrainedMuscles.length > 0 ? undertrainedMuscles.join(", ") : "All muscle groups have been trained recently"}

## Available Exercises (you MUST pick from this list exactly)
${exerciseListStr}

## Guidelines
- Pick 4-8 exercises appropriate for a ${split} split and ${duration}-minute session
- Include 1 warmup set per compound exercise (lighter weight, higher reps)
- Use realistic weights for an intermediate lifter (in kg)
- For ${duration} minutes: ${duration <= 30 ? "4-5 exercises, 2-3 working sets each" : duration <= 45 ? "5-6 exercises, 3 working sets each" : duration <= 60 ? "6-7 exercises, 3-4 working sets each" : "7-8 exercises, 3-4 working sets each"}
- Prioritize undertrained muscle groups when appropriate for the split
- Exercise names must match EXACTLY from the available list above

Respond with ONLY valid JSON matching this schema:
{
  "name": "string - short workout name like 'Upper Body Power' or 'Push Day'",
  "reasoning": "string - 2-3 sentences explaining WHY this workout was chosen.",
  "exercises": [
    {
      "exerciseName": "string - exact name from available exercises list",
      "reason": "string - brief reason for this exercise",
      "sets": [
        { "reps": number, "weight": number, "isWarmup": boolean }
      ]
    }
  ]
}`;
}

function buildSplitPrompt(params: SuggestSplitParams): string {
  const { daysPerWeek, recentWorkouts, availableExercises, energyLevel, equipment } = params;
  const grouped = groupExercisesByMuscle(availableExercises);
  const recentSummary = buildRecentWorkoutsSummary(recentWorkouts);
  const exerciseListStr = Object.entries(grouped)
    .map(([muscle, names]) => `## ${muscle}\n${names.join(", ")}`)
    .join("\n\n");

  const contextLines: string[] = [];
  if (energyLevel) {
    const energyDesc = energyLevel === "energized" ? "high energy" : energyLevel === "tired" ? "low energy — keep volume moderate" : "normal energy";
    contextLines.push(`User energy: ${energyDesc}`);
  }
  if (equipment) {
    const equipDesc = equipment === "full_gym" ? "full gym" : equipment === "home_gym" ? "home gym (dumbbells, bodyweight)" : "no equipment (bodyweight only)";
    contextLines.push(`Equipment: ${equipDesc}`);
  }

  return `Design a ${daysPerWeek}-day workout split program.${contextLines.length > 0 ? `\n\n## Context\n${contextLines.join("\n")}` : ""}

## Recent Workout History (last ${recentWorkouts.length} workouts)
${recentSummary}

## Available Exercises (you MUST pick from this list exactly)
${exerciseListStr}

## Guidelines
- Create exactly ${daysPerWeek} training days with appropriate muscle group distribution
- Each day: 5-7 exercises, 3-4 working sets each (include 1 warmup per compound)
- Use realistic weights for an intermediate lifter (in kg)
- Ensure balanced muscle group coverage across the week
- Exercise names must match EXACTLY from the available list above

Respond with ONLY valid JSON matching this schema:
{
  "name": "string - short split name like 'PPL Split' or '4-Day Upper Lower'",
  "reasoning": "string - 2-3 sentences explaining the split structure",
  "days": [
    {
      "dayName": "string - e.g. 'Push Day', 'Upper A', 'Legs'",
      "splitType": "string - e.g. 'Push', 'Upper Body', 'Legs'",
      "exercises": [
        {
          "exerciseName": "string - exact name from available exercises list",
          "reason": "string - brief reason",
          "sets": [
            { "reps": number, "weight": number, "isWarmup": boolean }
          ]
        }
      ]
    }
  ]
}`;
}

// ---------- Edge function call ----------

async function callAISuggest(
  prompt: string,
  maxTokens: number
): Promise<{ content: string; quota: QuotaInfo }> {
  const deviceId = await getDeviceId();

  const { data, error } = await supabase.functions.invoke("ai-suggest", {
    body: { deviceId, prompt, maxTokens },
  });

  if (error) {
    throw new Error(error.message || "AI service unavailable. Please try again.");
  }

  if (data?.error === "quota_exceeded") {
    throw new QuotaExceededError(data.quota as QuotaInfo);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { content: data.content as string, quota: data.quota as QuotaInfo };
}

// ---------- Public API ----------

export async function suggestWorkout(
  params: SuggestWorkoutParams
): Promise<AIResult<SuggestedWorkout>> {
  const prompt = buildWorkoutPrompt(params);
  const { content, quota } = await callAISuggest(prompt, 2048);

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: SuggestedWorkout;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse workout suggestion. Please try again.");
  }

  if (!parsed.name || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
    throw new Error("Invalid workout format received. Please try again.");
  }
  if (!parsed.reasoning) {
    parsed.reasoning = "Workout generated based on your preferences.";
  }
  for (const ex of parsed.exercises) {
    if (!ex.exerciseName || !Array.isArray(ex.sets) || ex.sets.length === 0) {
      throw new Error("Invalid exercise format received. Please try again.");
    }
  }

  return { data: parsed, quota };
}

export async function suggestSplit(
  params: SuggestSplitParams
): Promise<AIResult<SuggestedSplitPlan>> {
  const prompt = buildSplitPrompt(params);
  const { content, quota } = await callAISuggest(prompt, 6000);

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: SuggestedSplitPlan;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse split suggestion. Please try again.");
  }

  if (!parsed.name || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("Invalid split format received. Please try again.");
  }
  for (const day of parsed.days) {
    if (!day.dayName || !day.splitType || !Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw new Error("Invalid split day format received. Please try again.");
    }
  }

  return { data: parsed, quota };
}

// Match suggested exercise names to DB exercises (case-insensitive)
export function matchExercisesToDb(
  suggested: SuggestedExercise[],
  dbExercises: Exercise[]
): {
  matched: { exercise: Exercise; sets: SuggestedSet[] }[];
  unmatched: string[];
} {
  const matched: { exercise: Exercise; sets: SuggestedSet[] }[] = [];
  const unmatched: string[] = [];

  for (const sugEx of suggested) {
    const dbEx = dbExercises.find(
      (e) => e.name.toLowerCase() === sugEx.exerciseName.toLowerCase()
    );
    if (dbEx) {
      matched.push({ exercise: dbEx, sets: sugEx.sets });
    } else {
      unmatched.push(sugEx.exerciseName);
    }
  }

  return { matched, unmatched };
}
