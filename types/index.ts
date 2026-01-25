// Exercise Types
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight";

export type MovementPattern = "push" | "pull" | "hinge" | "squat" | "carry";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment | null;
  movementPattern: MovementPattern | null;
  imageUrl: string | null;
  isCustom: boolean;
  userId: string | null;
  createdAt: Date;
}

// Workout Types
export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  isWarmup: boolean;
  createdAt: Date;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes: string | null;
  orderIndex: number;
}

export interface Workout {
  id: string;
  userId: string | null;
  routineId: string | null;
  name: string | null;
  notes: string | null;
  startedAt: Date;
  completedAt: Date | null;
  exercises: WorkoutExercise[];
}

// Routine Types
export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  orderIndex: number;
}

export interface Routine {
  id: string;
  userId: string | null;
  splitDayId: string | null;
  name: string;
  description: string | null;
  isPreset: boolean;
  exercises: RoutineExercise[];
  createdAt: Date;
}

export interface SplitDay {
  id: string;
  splitId: string;
  name: string;
  dayOrder: number;
  routines: Routine[];
}

export interface Split {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  isPreset: boolean;
  days: SplitDay[];
  createdAt: Date;
}

// Progress Types
export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exercise: Exercise;
  weight: number;
  reps: number;
  achievedAt: Date;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  weight: number | null;
  photoUrl: string | null;
  notes: string | null;
  measuredAt: Date;
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
