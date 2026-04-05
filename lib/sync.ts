import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { getDatabase, generateId } from "@/lib/db/database";
import {
  getAllWorkouts,
  getWorkoutWithDetails,
  getBodyMeasurements,
} from "@/lib/db/workouts";

const LAST_SYNCED_KEY = "gym-track-last-synced";

export async function getLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNCED_KEY);
}

async function setLastSyncedAt(): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}

// Push a single completed workout (+ its exercises, sets) to Supabase
export async function syncWorkoutToCloud(workoutId: string, userId: string): Promise<void> {
  const workout = await getWorkoutWithDetails(workoutId);
  if (!workout || !workout.completed_at) return;

  // Upsert workout
  await supabase.from("gt_workouts").upsert({
    id: workout.id,
    user_id: userId,
    name: workout.name,
    notes: workout.notes,
    started_at: workout.started_at,
    completed_at: workout.completed_at,
    duration_seconds: workout.duration_seconds,
    created_at: workout.created_at,
  });

  for (const we of workout.exercises) {
    await supabase.from("gt_workout_exercises").upsert({
      id: we.id,
      user_id: userId,
      workout_id: workout.id,
      exercise_id: we.exercise_id,
      order_index: we.order_index,
      notes: we.notes,
      created_at: we.created_at,
    });

    const completedSets = we.sets.filter((s) => s.is_completed);
    for (const s of completedSets) {
      await supabase.from("gt_workout_sets").upsert({
        id: s.id,
        user_id: userId,
        workout_exercise_id: we.id,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
        is_warmup: s.is_warmup,
        is_completed: s.is_completed,
        created_at: s.created_at,
      });
    }
  }

  await setLastSyncedAt();
}

// Push all local data to Supabase
export async function backupAllToCloud(userId: string): Promise<{ workouts: number }> {
  const workouts = await getAllWorkouts();
  let count = 0;

  for (const workout of workouts) {
    await syncWorkoutToCloud(workout.id, userId);
    count++;
  }

  // Sync body measurements
  const measurements = await getBodyMeasurements(1000);
  for (const m of measurements) {
    await supabase.from("gt_body_measurements").upsert({
      id: m.id,
      user_id: userId,
      weight: m.weight,
      notes: m.notes,
      measured_at: m.measured_at,
      created_at: m.created_at,
    });
  }

  await setLastSyncedAt();
  return { workouts: count };
}

// Pull all cloud data into local SQLite (INSERT OR IGNORE — never overwrites local)
export async function restoreFromCloud(userId: string): Promise<{ workouts: number }> {
  const db = await getDatabase();

  // Fetch all user's workouts from Supabase
  const { data: cloudWorkouts } = await supabase
    .from("gt_workouts")
    .select("*")
    .eq("user_id", userId);

  if (!cloudWorkouts?.length) return { workouts: 0 };

  for (const w of cloudWorkouts) {
    await db.runAsync(
      `INSERT OR IGNORE INTO workouts (id, name, notes, started_at, completed_at, duration_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [w.id, w.name, w.notes, w.started_at, w.completed_at, w.duration_seconds, w.created_at]
    );

    // Fetch exercises for this workout
    const { data: cloudExercises } = await supabase
      .from("gt_workout_exercises")
      .select("*")
      .eq("workout_id", w.id)
      .eq("user_id", userId);

    for (const we of cloudExercises ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO workout_exercises (id, workout_id, exercise_id, order_index, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [we.id, we.workout_id, we.exercise_id, we.order_index, we.notes, we.created_at]
      );

      // Fetch sets
      const { data: cloudSets } = await supabase
        .from("gt_workout_sets")
        .select("*")
        .eq("workout_exercise_id", we.id)
        .eq("user_id", userId);

      for (const s of cloudSets ?? []) {
        await db.runAsync(
          `INSERT OR IGNORE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, is_warmup, is_completed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.workout_exercise_id, s.set_number, s.reps, s.weight, s.is_warmup, s.is_completed, s.created_at]
        );
      }
    }
  }

  // Restore body measurements
  const { data: cloudMeasurements } = await supabase
    .from("gt_body_measurements")
    .select("*")
    .eq("user_id", userId);

  for (const m of cloudMeasurements ?? []) {
    await db.runAsync(
      `INSERT OR IGNORE INTO body_measurements (id, weight, notes, measured_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [m.id, m.weight, m.notes, m.measured_at, m.created_at]
    );
  }

  return { workouts: cloudWorkouts.length };
}
