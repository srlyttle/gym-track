import { Share } from "react-native";
import { format } from "date-fns";
import { getWorkoutWithDetails } from "@/lib/db/workouts";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export async function shareWorkout(workoutId: string, unit: "kg" | "lbs" = "kg"): Promise<void> {
  const workout = await getWorkoutWithDetails(workoutId);
  if (!workout) return;

  const date = format(new Date(workout.started_at), "EEE, MMM d");
  const duration = formatDuration(workout.duration_seconds);
  const header = `💪 ${workout.name || "Workout"} — ${date}${duration ? ` · ${duration}` : ""}`;

  const exerciseLines: string[] = [];
  let totalVolume = 0;

  for (const ex of workout.exercises) {
    const completedSets = ex.sets.filter((s) => s.is_completed && !s.is_warmup);
    if (!completedSets.length) continue;

    exerciseLines.push(ex.exercise.name);
    completedSets.forEach((s, i) => {
      const w = unit === "lbs" && s.weight ? (s.weight * 2.205).toFixed(1) : s.weight;
      const weightStr = s.weight ? `${w}${unit}` : "BW";
      exerciseLines.push(`  Set ${i + 1}: ${weightStr} × ${s.reps ?? "—"}`);
      if (s.weight && s.reps) totalVolume += s.weight * s.reps;
    });
    exerciseLines.push("");
  }

  const volumeStr = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}k ${unit}`
    : `${Math.round(totalVolume)} ${unit}`;

  const footer = [
    totalVolume > 0 && `Total volume: ${volumeStr}`,
    workout.exercises.length > 0 && `${workout.exercises.length} exercise${workout.exercises.length !== 1 ? "s" : ""}`,
  ].filter(Boolean).join(" | ");

  const message = [header, "", ...exerciseLines, footer].join("\n").trim();

  await Share.share({ message });
}
