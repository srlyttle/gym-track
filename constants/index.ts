export * from "./colors";

export const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef4444",
  back: "#3b82f6",
  shoulders: "#f59e0b",
  biceps: "#8b5cf6",
  triceps: "#ec4899",
  legs: "#10b981",
  core: "#f97316",
  forearms: "#6b7280",
};

export const REST_TIMER_PRESETS = [30, 60, 90, 120, 180] as const;

export const WEIGHT_INCREMENTS = {
  kg: [1.25, 2.5, 5, 10, 20],
  lbs: [2.5, 5, 10, 25, 45],
} as const;

export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
] as const;

export const EQUIPMENT_TYPES = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
] as const;

export const MOVEMENT_PATTERNS = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "hinge", label: "Hinge" },
  { id: "squat", label: "Squat" },
  { id: "carry", label: "Carry" },
] as const;
