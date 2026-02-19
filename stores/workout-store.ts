import { create } from "zustand";
import * as db from "@/lib/db";
import type {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  WorkoutExerciseWithDetails,
} from "@/types";

interface ActiveWorkoutState {
  workout: Workout | null;
  exercises: WorkoutExerciseWithDetails[];
}

interface WorkoutState {
  active: ActiveWorkoutState | null;
  isLoading: boolean;
  restTimerEndTime: number | null;
  restTimerDuration: number;

  // Workout lifecycle
  startWorkout: (name?: string) => Promise<void>;
  startWorkoutWithExercises: (
    name: string,
    exercises: {
      exerciseId: string;
      sets: { reps: number; weight: number; isWarmup: boolean }[];
    }[]
  ) => Promise<void>;
  completeWorkout: (notes?: string) => Promise<void>;
  discardWorkout: () => Promise<void>;

  // Exercise management
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;

  // Set management
  addSet: (workoutExerciseId: string) => Promise<void>;
  updateSet: (
    setId: string,
    data: { reps?: number; weight?: number; is_warmup?: boolean }
  ) => Promise<void>;
  completeSet: (
    setId: string,
    reps: number,
    weight: number,
    isWarmup?: boolean
  ) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;

  // Timer
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;

  // Helpers
  refreshExercises: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  active: null,
  isLoading: false,
  restTimerEndTime: null,
  restTimerDuration: 90,

  startWorkout: async (name?: string) => {
    set({ isLoading: true });
    try {
      const workout = await db.createWorkout(name);
      set({
        active: {
          workout,
          exercises: [],
        },
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to start workout:", error);
      set({ isLoading: false });
    }
  },

  startWorkoutWithExercises: async (name, exercises) => {
    set({ isLoading: true });
    try {
      const workout = await db.createWorkout(name);

      for (const ex of exercises) {
        const workoutExercise = await db.addExerciseToWorkout(
          workout.id,
          ex.exerciseId
        );

        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          const workoutSet = await db.addSet(workoutExercise.id, i + 1);
          await db.updateSet(workoutSet.id, {
            reps: s.reps,
            weight: s.weight,
            is_warmup: s.isWarmup,
          });
        }
      }

      set({
        active: {
          workout,
          exercises: [],
        },
        isLoading: false,
      });

      // Refresh to load all exercises with details
      await get().refreshExercises();
    } catch (error) {
      console.error("Failed to start workout with exercises:", error);
      set({ isLoading: false });
    }
  },

  completeWorkout: async (notes?: string) => {
    const { active } = get();
    if (!active?.workout) return;

    set({ isLoading: true });
    try {
      await db.completeWorkout(active.workout.id, notes);
      set({ active: null, isLoading: false, restTimerEndTime: null });
    } catch (error) {
      console.error("Failed to complete workout:", error);
      set({ isLoading: false });
    }
  },

  discardWorkout: async () => {
    const { active } = get();
    if (!active?.workout) return;

    set({ isLoading: true });
    try {
      await db.deleteWorkout(active.workout.id);
      set({ active: null, isLoading: false, restTimerEndTime: null });
    } catch (error) {
      console.error("Failed to discard workout:", error);
      set({ isLoading: false });
    }
  },

  addExercise: async (exercise: Exercise) => {
    const { active, refreshExercises } = get();
    if (!active?.workout) return;

    try {
      const workoutExercise = await db.addExerciseToWorkout(
        active.workout.id,
        exercise.id
      );

      // Add first set automatically
      await db.addSet(workoutExercise.id, 1);

      await refreshExercises();
    } catch (error) {
      console.error("Failed to add exercise:", error);
    }
  },

  removeExercise: async (workoutExerciseId: string) => {
    const { refreshExercises } = get();
    try {
      await db.removeExerciseFromWorkout(workoutExerciseId);
      await refreshExercises();
    } catch (error) {
      console.error("Failed to remove exercise:", error);
    }
  },

  addSet: async (workoutExerciseId: string) => {
    const { active, refreshExercises } = get();
    if (!active) return;

    try {
      const exercise = active.exercises.find((e) => e.id === workoutExerciseId);
      const nextSetNumber = (exercise?.sets.length || 0) + 1;
      await db.addSet(workoutExerciseId, nextSetNumber);
      await refreshExercises();
    } catch (error) {
      console.error("Failed to add set:", error);
    }
  },

  updateSet: async (setId, data) => {
    const { refreshExercises } = get();
    try {
      await db.updateSet(setId, data);
      await refreshExercises();
    } catch (error) {
      console.error("Failed to update set:", error);
    }
  },

  completeSet: async (setId, reps, weight, isWarmup = false) => {
    const { active, refreshExercises, startRestTimer, restTimerDuration } = get();
    try {
      await db.completeSet(setId, reps, weight, isWarmup);

      // Check for new PR (only for non-warmup sets)
      if (!isWarmup && active) {
        // Find the exercise this set belongs to
        for (const exercise of active.exercises) {
          const set = exercise.sets.find((s) => s.id === setId);
          if (set) {
            await db.checkAndSavePersonalRecord(
              exercise.exercise_id,
              weight,
              reps,
              setId
            );
            break;
          }
        }
      }

      await refreshExercises();

      // Auto-start rest timer
      if (!isWarmup) {
        startRestTimer(restTimerDuration);
      }
    } catch (error) {
      console.error("Failed to complete set:", error);
    }
  },

  deleteSet: async (workoutExerciseId, setId) => {
    const { refreshExercises } = get();
    try {
      await db.deleteSet(setId);
      await refreshExercises();
    } catch (error) {
      console.error("Failed to delete set:", error);
    }
  },

  startRestTimer: (seconds: number) => {
    set({
      restTimerEndTime: Date.now() + seconds * 1000,
      restTimerDuration: seconds,
    });
  },

  clearRestTimer: () => {
    set({ restTimerEndTime: null });
  },

  refreshExercises: async () => {
    const { active } = get();
    if (!active?.workout) return;

    try {
      const workoutExercises = await db.getWorkoutExercises(active.workout.id);

      const exercisesWithDetails: WorkoutExerciseWithDetails[] = [];

      for (const we of workoutExercises) {
        const exercise = await db.getExerciseById(we.exercise_id);
        const sets = await db.getSetsForExercise(we.id);

        if (exercise) {
          exercisesWithDetails.push({
            ...we,
            exercise,
            sets,
          });
        }
      }

      set({
        active: {
          ...active,
          exercises: exercisesWithDetails,
        },
      });
    } catch (error) {
      console.error("Failed to refresh exercises:", error);
    }
  },
}));
