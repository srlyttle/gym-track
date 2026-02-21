import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Exercise, MuscleGroup } from "@/types";

const API_KEY_STORAGE_KEY = "claude_api_key";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// API key management
export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_STORAGE_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
}

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
  // Look at last 3 workouts for "recently trained"
  const recent = workouts.slice(0, 3);
  for (const w of recent) {
    for (const e of w.exercises) {
      muscleCounts[e.primaryMuscle] = (muscleCounts[e.primaryMuscle] || 0) + 1;
    }
  }
  return Object.keys(muscleCounts);
}

function buildPrompt(params: SuggestWorkoutParams): string {
  const { recentWorkouts, split, duration, availableExercises, energyLevel, equipment } = params;

  const grouped = groupExercisesByMuscle(availableExercises);
  const recentSummary = buildRecentWorkoutsSummary(recentWorkouts);
  const recentMuscles = findRecentlyTrainedMuscles(recentWorkouts);
  const allMuscles = Object.keys(grouped);
  const undertrainedMuscles = allMuscles.filter(
    (m) => !recentMuscles.includes(m)
  );

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
  "reasoning": "string - 2-3 sentences explaining WHY this workout was chosen. Reference the user's recent training history, which muscle groups need attention, and how the split/time influenced exercise selection.",
  "exercises": [
    {
      "exerciseName": "string - exact name from available exercises list",
      "reason": "string - brief reason for this exercise and the chosen sets/reps/weight (e.g. 'Compound chest builder — 3x10 at moderate weight for hypertrophy')",
      "sets": [
        { "reps": number, "weight": number, "isWarmup": boolean }
      ]
    }
  ]
}`;
}

export async function suggestWorkout(
  params: SuggestWorkoutParams
): Promise<SuggestedWorkout> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      "Claude API key not configured. Go to Profile > Settings to add your API key."
    );
  }

  const userPrompt = buildPrompt(params);

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system:
        "You are an expert fitness coach and personal trainer. Return ONLY valid JSON with no additional text, markdown, or explanation.",
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      throw new Error(
        "Invalid API key. Check your Claude API key in Profile > Settings."
      );
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    throw new Error(`API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Claude API.");
  }

  // Extract JSON from response (handle potential markdown code blocks)
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

  // Validate structure
  if (
    !parsed.name ||
    !Array.isArray(parsed.exercises) ||
    parsed.exercises.length === 0
  ) {
    throw new Error("Invalid workout format received. Please try again.");
  }

  // Default reasoning if not provided
  if (!parsed.reasoning) {
    parsed.reasoning = "Workout generated based on your preferences.";
  }

  for (const ex of parsed.exercises) {
    if (!ex.exerciseName || !Array.isArray(ex.sets) || ex.sets.length === 0) {
      throw new Error("Invalid exercise format received. Please try again.");
    }
  }

  return parsed;
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
  "reasoning": "string - 2-3 sentences explaining the split structure and why it suits this user",
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

export async function suggestSplit(
  params: SuggestSplitParams
): Promise<SuggestedSplitPlan> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      "Claude API key not configured. Go to Profile > Settings to add your API key."
    );
  }

  const userPrompt = buildSplitPrompt(params);

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 6000,
      system:
        "You are an expert fitness coach and personal trainer. Return ONLY valid JSON with no additional text, markdown, or explanation.",
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      throw new Error(
        "Invalid API key. Check your Claude API key in Profile > Settings."
      );
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    throw new Error(`API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Claude API.");
  }

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

  if (
    !parsed.name ||
    !Array.isArray(parsed.days) ||
    parsed.days.length === 0
  ) {
    throw new Error("Invalid split format received. Please try again.");
  }

  for (const day of parsed.days) {
    if (
      !day.dayName ||
      !day.splitType ||
      !Array.isArray(day.exercises) ||
      day.exercises.length === 0
    ) {
      throw new Error("Invalid split day format received. Please try again.");
    }
  }

  return parsed;
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
