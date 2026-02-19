import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { format, subDays, subWeeks } from "date-fns";
import { getWorkoutsInDateRange } from "./db/workouts";
import type { WorkoutWithDetails } from "@/types";

export type ExportRange = "1week" | "2weeks" | "4weeks" | "8weeks";

const RANGE_DAYS: Record<ExportRange, number> = {
  "1week": 7,
  "2weeks": 14,
  "4weeks": 28,
  "8weeks": 56,
};

function formatWorkoutsForExport(workouts: WorkoutWithDetails[]) {
  return workouts.map((w) => ({
    date: w.started_at,
    name: w.name,
    notes: w.notes,
    duration_minutes: w.duration_seconds
      ? Math.round(w.duration_seconds / 60)
      : null,
    exercises: w.exercises.map((ex) => ({
      name: ex.exercise.name,
      muscle_group: ex.exercise.primary_muscle,
      secondary_muscles: ex.exercise.secondary_muscles,
      equipment: ex.exercise.equipment,
      movement_pattern: ex.exercise.movement_pattern,
      notes: ex.notes,
      sets: ex.sets
        .filter((s) => s.is_completed)
        .map((s) => ({
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
          is_warmup: !!s.is_warmup,
        })),
    })),
  }));
}

function buildSummary(workouts: WorkoutWithDetails[], days: number) {
  const totalWorkouts = workouts.length;
  const muscleFrequency: Record<string, number> = {};
  const exerciseFrequency: Record<string, number> = {};
  let totalSets = 0;
  let totalVolume = 0;

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const muscle = ex.exercise.primary_muscle;
      muscleFrequency[muscle] = (muscleFrequency[muscle] || 0) + 1;

      const name = ex.exercise.name;
      exerciseFrequency[name] = (exerciseFrequency[name] || 0) + 1;

      for (const s of ex.sets) {
        if (s.is_completed && !s.is_warmup) {
          totalSets++;
          totalVolume += (s.reps || 0) * (s.weight || 0);
        }
      }
    }
  }

  return {
    period_days: days,
    total_workouts: totalWorkouts,
    avg_workouts_per_week: Math.round((totalWorkouts / days) * 7 * 10) / 10,
    total_working_sets: totalSets,
    total_volume: Math.round(totalVolume),
    muscle_group_frequency: muscleFrequency,
    exercise_frequency: exerciseFrequency,
  };
}

export async function exportWorkouts(range: ExportRange): Promise<{
  workoutCount: number;
  filePath: string;
}> {
  const days = RANGE_DAYS[range];
  const endDate = new Date().toISOString();
  const startDate = subDays(new Date(), days).toISOString();

  const workouts = await getWorkoutsInDateRange(startDate, endDate);

  const exportData = {
    exported_at: new Date().toISOString(),
    range: `Last ${days} days`,
    summary: buildSummary(workouts, days),
    workouts: formatWorkoutsForExport(workouts),
  };

  const fileName = `gymtrack-export-${format(new Date(), "yyyy-MM-dd")}.json`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(
    filePath,
    JSON.stringify(exportData, null, 2)
  );

  return { workoutCount: workouts.length, filePath };
}

export async function shareExportFile(filePath: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: "application/json",
      dialogTitle: "Export Workout Data",
    });
  }
}
