import { getDatabase, generateId } from "./database";
import type { Workout, WorkoutExercise, WorkoutSet, PersonalRecord, WorkoutExerciseWithDetails, WorkoutWithDetails, Exercise } from "@/types";

// Workout operations
export async function createWorkout(name?: string): Promise<Workout> {
  const db = await getDatabase();
  const id = generateId();
  const startedAt = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO workouts (id, name, started_at) VALUES (?, ?, ?)",
    [id, name || null, startedAt]
  );

  return {
    id,
    name: name || null,
    notes: null,
    started_at: startedAt,
    completed_at: null,
    duration_seconds: null,
    created_at: startedAt,
  };
}

export async function completeWorkout(id: string, notes?: string): Promise<void> {
  const db = await getDatabase();
  const completedAt = new Date().toISOString();

  // Calculate duration
  const workout = await getWorkoutById(id);
  if (!workout) return;

  const startTime = new Date(workout.started_at).getTime();
  const endTime = new Date(completedAt).getTime();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  await db.runAsync(
    "UPDATE workouts SET completed_at = ?, duration_seconds = ?, notes = ? WHERE id = ?",
    [completedAt, durationSeconds, notes || workout.notes, id]
  );
}

export async function getWorkoutById(id: string): Promise<Workout | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Workout>(
    "SELECT * FROM workouts WHERE id = ?",
    [id]
  );
  return result || null;
}

export async function getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Workout>(
    "SELECT * FROM workouts WHERE completed_at IS NOT NULL ORDER BY started_at DESC LIMIT ?",
    [limit]
  );
  return results;
}

export async function getWorkoutsThisWeek(): Promise<Workout[]> {
  const db = await getDatabase();
  const startOfWeek = getStartOfWeek();
  const results = await db.getAllAsync<Workout>(
    "SELECT * FROM workouts WHERE completed_at IS NOT NULL AND started_at >= ? ORDER BY started_at DESC",
    [startOfWeek.toISOString()]
  );
  return results;
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM workouts WHERE id = ?", [id]);
}

export async function updateWorkoutNotes(id: string, notes: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE workouts SET notes = ? WHERE id = ?", [notes, id]);
}

// Workout Exercise operations
export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string
): Promise<WorkoutExercise> {
  const db = await getDatabase();
  const id = generateId();

  // Get next order index
  const result = await db.getFirstAsync<{ maxOrder: number | null }>(
    "SELECT MAX(order_index) as maxOrder FROM workout_exercises WHERE workout_id = ?",
    [workoutId]
  );
  const orderIndex = (result?.maxOrder ?? -1) + 1;

  await db.runAsync(
    "INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index) VALUES (?, ?, ?, ?)",
    [id, workoutId, exerciseId, orderIndex]
  );

  return {
    id,
    workout_id: workoutId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    notes: null,
    created_at: new Date().toISOString(),
  };
}

export async function getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<WorkoutExercise>(
    "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC",
    [workoutId]
  );
  return results;
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM workout_exercises WHERE id = ?", [workoutExerciseId]);
}

export async function updateExerciseNotes(
  workoutExerciseId: string,
  notes: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE workout_exercises SET notes = ? WHERE id = ?",
    [notes, workoutExerciseId]
  );
}

// Workout Set operations
export async function addSet(
  workoutExerciseId: string,
  setNumber: number
): Promise<WorkoutSet> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(
    "INSERT INTO workout_sets (id, workout_exercise_id, set_number) VALUES (?, ?, ?)",
    [id, workoutExerciseId, setNumber]
  );

  return {
    id,
    workout_exercise_id: workoutExerciseId,
    set_number: setNumber,
    reps: null,
    weight: null,
    is_warmup: 0,
    is_completed: 0,
    created_at: new Date().toISOString(),
  };
}

export async function getSetsForExercise(workoutExerciseId: string): Promise<WorkoutSet[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<WorkoutSet>(
    "SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC",
    [workoutExerciseId]
  );
  return results;
}

export async function updateSet(
  setId: string,
  data: { reps?: number; weight?: number; is_warmup?: boolean; is_completed?: boolean }
): Promise<void> {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.reps !== undefined) {
    updates.push("reps = ?");
    values.push(data.reps);
  }
  if (data.weight !== undefined) {
    updates.push("weight = ?");
    values.push(data.weight);
  }
  if (data.is_warmup !== undefined) {
    updates.push("is_warmup = ?");
    values.push(data.is_warmup ? 1 : 0);
  }
  if (data.is_completed !== undefined) {
    updates.push("is_completed = ?");
    values.push(data.is_completed ? 1 : 0);
  }

  if (updates.length === 0) return;

  values.push(setId);
  await db.runAsync(
    `UPDATE workout_sets SET ${updates.join(", ")} WHERE id = ?`,
    values
  );
}

export async function deleteSet(setId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM workout_sets WHERE id = ?", [setId]);
}

export async function completeSet(
  setId: string,
  reps: number,
  weight: number,
  isWarmup: boolean = false
): Promise<void> {
  await updateSet(setId, {
    reps,
    weight,
    is_warmup: isWarmup,
    is_completed: true,
  });
}

// Stats and history
export async function getExerciseHistory(
  exerciseId: string,
  limit: number = 10
): Promise<{ date: string; sets: WorkoutSet[] }[]> {
  const db = await getDatabase();

  const workoutExercises = await db.getAllAsync<WorkoutExercise & { started_at: string }>(
    `SELECT we.*, w.started_at
     FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ? AND w.completed_at IS NOT NULL
     ORDER BY w.started_at DESC
     LIMIT ?`,
    [exerciseId, limit]
  );

  const history: { date: string; sets: WorkoutSet[] }[] = [];

  for (const we of workoutExercises) {
    const sets = await getSetsForExercise(we.id);
    history.push({
      date: we.started_at,
      sets: sets.filter((s) => s.is_completed),
    });
  }

  return history;
}

export async function getLastPerformance(
  exerciseId: string
): Promise<{ reps: number; weight: number } | null> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ reps: number; weight: number }>(
    `SELECT ws.reps, ws.weight
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.exercise_id = ?
       AND w.completed_at IS NOT NULL
       AND ws.is_completed = 1
       AND ws.is_warmup = 0
     ORDER BY w.started_at DESC, ws.set_number DESC
     LIMIT 1`,
    [exerciseId]
  );

  return result || null;
}

export async function getTotalVolumeThisWeek(): Promise<number> {
  const db = await getDatabase();
  const startOfWeek = getStartOfWeek();

  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(ws.reps * ws.weight) as total
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.completed_at IS NOT NULL
       AND w.started_at >= ?
       AND ws.is_completed = 1
       AND ws.is_warmup = 0`,
    [startOfWeek.toISOString()]
  );

  return result?.total || 0;
}

// Get workout with full details (exercises and sets)
export async function getWorkoutWithDetails(workoutId: string): Promise<WorkoutWithDetails | null> {
  const db = await getDatabase();

  const workout = await getWorkoutById(workoutId);
  if (!workout) return null;

  const workoutExercises = await db.getAllAsync<WorkoutExercise & Exercise>(
    `SELECT we.*, e.name, e.primary_muscle, e.secondary_muscles, e.equipment, e.movement_pattern, e.instructions, e.is_custom, e.created_at as exercise_created_at
     FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?
     ORDER BY we.order_index ASC`,
    [workoutId]
  );

  const exercises: WorkoutExerciseWithDetails[] = [];

  for (const we of workoutExercises) {
    const sets = await getSetsForExercise(we.id);
    exercises.push({
      id: we.id,
      workout_id: we.workout_id,
      exercise_id: we.exercise_id,
      order_index: we.order_index,
      notes: we.notes,
      created_at: we.created_at,
      exercise: {
        id: we.exercise_id,
        name: we.name,
        primary_muscle: we.primary_muscle,
        secondary_muscles: we.secondary_muscles,
        equipment: we.equipment,
        movement_pattern: we.movement_pattern,
        instructions: we.instructions,
        is_custom: we.is_custom,
        created_at: (we as any).exercise_created_at,
      },
      sets,
    });
  }

  return {
    ...workout,
    exercises,
  };
}

// Get all completed workouts
export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Workout>(
    "SELECT * FROM workouts WHERE completed_at IS NOT NULL ORDER BY started_at DESC"
  );
  return results;
}

// Get total workout count
export async function getTotalWorkoutCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workouts WHERE completed_at IS NOT NULL"
  );
  return result?.count || 0;
}

// Personal Record operations
export async function getPersonalRecordsCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM personal_records"
  );
  return result?.count || 0;
}

export async function getRecentPersonalRecords(limit: number = 10): Promise<(PersonalRecord & { exercise_name: string })[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<PersonalRecord & { exercise_name: string }>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     ORDER BY pr.achieved_at DESC
     LIMIT ?`,
    [limit]
  );
  return results;
}

export async function checkAndSavePersonalRecord(
  exerciseId: string,
  weight: number,
  reps: number,
  workoutSetId: string
): Promise<PersonalRecord | null> {
  const db = await getDatabase();

  // Get best existing PR for this exercise
  const existingPR = await db.getFirstAsync<PersonalRecord>(
    `SELECT * FROM personal_records
     WHERE exercise_id = ?
     ORDER BY weight DESC, reps DESC
     LIMIT 1`,
    [exerciseId]
  );

  // Check if this is a new PR (higher weight, or same weight with more reps)
  const isNewPR = !existingPR ||
    weight > existingPR.weight ||
    (weight === existingPR.weight && reps > existingPR.reps);

  if (isNewPR && weight > 0 && reps > 0) {
    const id = generateId();
    const achievedAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, weight, reps, achieved_at, workout_set_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, exerciseId, weight, reps, achievedAt, workoutSetId]
    );

    return {
      id,
      exercise_id: exerciseId,
      weight,
      reps,
      achieved_at: achievedAt,
      workout_set_id: workoutSetId,
      created_at: achievedAt,
    };
  }

  return null;
}

// Get exercise count for a workout
export async function getWorkoutExerciseCount(workoutId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?",
    [workoutId]
  );
  return result?.count || 0;
}

// Get total volume for a workout
export async function getWorkoutVolume(workoutId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(ws.reps * ws.weight) as total
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     WHERE we.workout_id = ?
       AND ws.is_completed = 1
       AND ws.is_warmup = 0`,
    [workoutId]
  );
  return result?.total || 0;
}

// Get completed workouts within a date range with full details
export async function getWorkoutsInDateRange(
  startDate: string,
  endDate: string
): Promise<WorkoutWithDetails[]> {
  const db = await getDatabase();

  const workouts = await db.getAllAsync<Workout>(
    `SELECT * FROM workouts
     WHERE completed_at IS NOT NULL
       AND started_at >= ?
       AND started_at <= ?
     ORDER BY started_at DESC`,
    [startDate, endDate]
  );

  const results: WorkoutWithDetails[] = [];

  for (const workout of workouts) {
    const detailed = await getWorkoutWithDetails(workout.id);
    if (detailed) {
      results.push(detailed);
    }
  }

  return results;
}

// Helper functions
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}
