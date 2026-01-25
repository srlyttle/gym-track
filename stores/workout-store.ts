import { create } from "zustand";
import type { Workout, WorkoutExercise, WorkoutSet, Exercise } from "@/types";

interface WorkoutState {
  activeWorkout: Workout | null;
  isWorkoutActive: boolean;
  restTimerEndTime: number | null;

  // Workout actions
  startWorkout: (routineId?: string | null) => void;
  endWorkout: () => void;
  discardWorkout: () => void;

  // Exercise actions
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void;

  // Set actions
  addSet: (workoutExerciseId: string, set: Omit<WorkoutSet, "id" | "createdAt">) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;

  // Timer actions
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;

  // Workout notes
  updateWorkoutNotes: (notes: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  isWorkoutActive: false,
  restTimerEndTime: null,

  startWorkout: (routineId = null) => {
    const workout: Workout = {
      id: generateId(),
      userId: null,
      routineId,
      name: null,
      notes: null,
      startedAt: new Date(),
      completedAt: null,
      exercises: [],
    };
    set({ activeWorkout: workout, isWorkoutActive: true });
  },

  endWorkout: () => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      set({
        activeWorkout: {
          ...activeWorkout,
          completedAt: new Date(),
        },
        isWorkoutActive: false,
        restTimerEndTime: null,
      });
      // TODO: Save to database
    }
  },

  discardWorkout: () => {
    set({
      activeWorkout: null,
      isWorkoutActive: false,
      restTimerEndTime: null,
    });
  },

  addExercise: (exercise) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const workoutExercise: WorkoutExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exercise,
      sets: [],
      notes: null,
      orderIndex: activeWorkout.exercises.length,
    };

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, workoutExercise],
      },
    });
  },

  removeExercise: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises
          .filter((e) => e.id !== workoutExerciseId)
          .map((e, index) => ({ ...e, orderIndex: index })),
      },
    });
  },

  reorderExercises: (fromIndex, toIndex) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const exercises = [...activeWorkout.exercises];
    const [removed] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, removed);

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: exercises.map((e, index) => ({ ...e, orderIndex: index })),
      },
    });
  },

  updateExerciseNotes: (workoutExerciseId, notes) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((e) =>
          e.id === workoutExerciseId ? { ...e, notes } : e
        ),
      },
    });
  },

  addSet: (workoutExerciseId, setData) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const newSet: WorkoutSet = {
      id: generateId(),
      ...setData,
      createdAt: new Date(),
    };

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((e) =>
          e.id === workoutExerciseId
            ? { ...e, sets: [...e.sets, newSet] }
            : e
        ),
      },
    });
  },

  updateSet: (workoutExerciseId, setId, updates) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((e) =>
          e.id === workoutExerciseId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, ...updates } : s
                ),
              }
            : e
        ),
      },
    });
  },

  removeSet: (workoutExerciseId, setId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((e) =>
          e.id === workoutExerciseId
            ? {
                ...e,
                sets: e.sets
                  .filter((s) => s.id !== setId)
                  .map((s, index) => ({ ...s, setNumber: index + 1 })),
              }
            : e
        ),
      },
    });
  },

  startRestTimer: (seconds) => {
    set({ restTimerEndTime: Date.now() + seconds * 1000 });
  },

  clearRestTimer: () => {
    set({ restTimerEndTime: null });
  },

  updateWorkoutNotes: (notes) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        notes,
      },
    });
  },
}));
