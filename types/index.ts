// Exercise Types
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core"
  | "forearms";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight";

export type MovementPattern =
  | "push"
  | "pull"
  | "hinge"
  | "squat"
  | "carry"
  | "lunge"
  | "rotation";

// SQLite row types (snake_case to match database)
export interface Exercise {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: string | null;
  equipment: Equipment | null;
  movement_pattern: MovementPattern | null;
  instructions: string | null;
  is_custom: number; // SQLite boolean
  created_at: string;
}

export interface Workout {
  id: string;
  name: string | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  is_warmup: number; // SQLite boolean
  is_completed: number; // SQLite boolean
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  achieved_at: string;
  workout_set_id: string | null;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  weight: number | null;
  notes: string | null;
  measured_at: string;
  created_at: string;
}

// Enriched types for UI (with joined data)
export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutWithDetails extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

// Settings Types
export type WeightUnit = "kg" | "lbs";
export type ThemePreference = "light" | "dark" | "system";

export interface UserSettings {
  unitPreference: WeightUnit;
  themePreference: ThemePreference;
  restTimerDefault: number; // in seconds
}

// Auth Types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

// Filter types
export interface ExerciseFilters {
  muscle?: MuscleGroup;
  equipment?: Equipment;
  movement?: MovementPattern;
  search?: string;
}

// Split / PT Program Types
export interface ActiveSplit {
  id: string;
  name: string;
  source: "ai" | "pt";
  ptTrainerId?: string;
  ptProgramId?: string;
  currentDayIndex: number;
  days: ActiveSplitDay[];
  activatedAt: string;
}

export interface ActiveSplitDay {
  dayName: string;
  splitType: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: import("@/lib/ai/claude").SuggestedSet[];
  }[];
}

export interface PTTrainer {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  programs: PTProgram[];
}

export interface PTProgram {
  id: string;
  trainerId: string;
  name: string;
  description: string;
  daysPerWeek: number;
  days: PTDay[];
}

export interface PTDay {
  dayName: string;
  splitType: string;
  exercises: PTExercise[];
}

export interface PTExercise {
  exerciseName: string;
  sets: import("@/lib/ai/claude").SuggestedSet[];
}
