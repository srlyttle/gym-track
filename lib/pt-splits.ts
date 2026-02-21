import type { PTTrainer, PTProgram } from "@/types";

const PT_TRAINERS: PTTrainer[] = [
  {
    id: "marcus-webb",
    name: "Marcus Webb",
    specialty: "Strength & Powerlifting",
    bio: "Strength coach with 10+ years experience. Specialises in progressive overload and compound movement fundamentals.",
    programs: [
      {
        id: "531-foundation",
        trainerId: "marcus-webb",
        name: "5/3/1 Foundation",
        description: "4-day Upper/Lower split built on progressive overload. Alternates push-focus and pull-focus upper days with squat and hinge lower days.",
        daysPerWeek: 4,
        days: [
          {
            dayName: "Upper A — Push Focus",
            splitType: "Upper Body",
            exercises: [
              {
                exerciseName: "Barbell Bench Press",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 5, weight: 60, isWarmup: false },
                  { reps: 5, weight: 65, isWarmup: false },
                  { reps: 5, weight: 70, isWarmup: false },
                ],
              },
              {
                exerciseName: "Overhead Press",
                sets: [
                  { reps: 8, weight: 30, isWarmup: true },
                  { reps: 5, weight: 45, isWarmup: false },
                  { reps: 5, weight: 47.5, isWarmup: false },
                  { reps: 5, weight: 50, isWarmup: false },
                ],
              },
              {
                exerciseName: "Incline Dumbbell Press",
                sets: [
                  { reps: 10, weight: 18, isWarmup: false },
                  { reps: 10, weight: 18, isWarmup: false },
                  { reps: 10, weight: 18, isWarmup: false },
                ],
              },
              {
                exerciseName: "Tricep Pushdown",
                sets: [
                  { reps: 12, weight: 20, isWarmup: false },
                  { reps: 12, weight: 20, isWarmup: false },
                  { reps: 12, weight: 20, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lateral Raise",
                sets: [
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Lower A — Squat Focus",
            splitType: "Lower Body",
            exercises: [
              {
                exerciseName: "Back Squat",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 5, weight: 70, isWarmup: false },
                  { reps: 5, weight: 75, isWarmup: false },
                  { reps: 5, weight: 80, isWarmup: false },
                ],
              },
              {
                exerciseName: "Romanian Deadlift",
                sets: [
                  { reps: 10, weight: 50, isWarmup: false },
                  { reps: 10, weight: 50, isWarmup: false },
                  { reps: 10, weight: 50, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Press",
                sets: [
                  { reps: 12, weight: 80, isWarmup: false },
                  { reps: 12, weight: 80, isWarmup: false },
                  { reps: 12, weight: 80, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Curl",
                sets: [
                  { reps: 12, weight: 30, isWarmup: false },
                  { reps: 12, weight: 30, isWarmup: false },
                  { reps: 12, weight: 30, isWarmup: false },
                ],
              },
              {
                exerciseName: "Calf Raise Machine",
                sets: [
                  { reps: 15, weight: 40, isWarmup: false },
                  { reps: 15, weight: 40, isWarmup: false },
                  { reps: 15, weight: 40, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Upper B — Pull Focus",
            splitType: "Upper Body",
            exercises: [
              {
                exerciseName: "Barbell Row",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 5, weight: 60, isWarmup: false },
                  { reps: 5, weight: 65, isWarmup: false },
                  { reps: 5, weight: 70, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lat Pulldown",
                sets: [
                  { reps: 10, weight: 45, isWarmup: false },
                  { reps: 10, weight: 45, isWarmup: false },
                  { reps: 10, weight: 45, isWarmup: false },
                ],
              },
              {
                exerciseName: "Face Pull",
                sets: [
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                ],
              },
              {
                exerciseName: "Barbell Curl",
                sets: [
                  { reps: 10, weight: 25, isWarmup: false },
                  { reps: 10, weight: 25, isWarmup: false },
                  { reps: 10, weight: 25, isWarmup: false },
                ],
              },
              {
                exerciseName: "Rear Delt Fly",
                sets: [
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Lower B — Hinge Focus",
            splitType: "Lower Body",
            exercises: [
              {
                exerciseName: "Deadlift",
                sets: [
                  { reps: 8, weight: 60, isWarmup: true },
                  { reps: 5, weight: 90, isWarmup: false },
                  { reps: 5, weight: 95, isWarmup: false },
                  { reps: 5, weight: 100, isWarmup: false },
                ],
              },
              {
                exerciseName: "Front Squat",
                sets: [
                  { reps: 8, weight: 40, isWarmup: false },
                  { reps: 8, weight: 40, isWarmup: false },
                  { reps: 8, weight: 40, isWarmup: false },
                ],
              },
              {
                exerciseName: "Bulgarian Split Squat",
                sets: [
                  { reps: 10, weight: 16, isWarmup: false },
                  { reps: 10, weight: 16, isWarmup: false },
                  { reps: 10, weight: 16, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Extension",
                sets: [
                  { reps: 15, weight: 30, isWarmup: false },
                  { reps: 15, weight: 30, isWarmup: false },
                  { reps: 15, weight: 30, isWarmup: false },
                ],
              },
              {
                exerciseName: "Seated Calf Raise",
                sets: [
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    specialty: "Hypertrophy & Body Recomposition",
    bio: "NASM-certified coach focused on evidence-based hypertrophy programming. Known for high-volume, muscle-group-specific training.",
    programs: [
      {
        id: "ppl-hypertrophy",
        trainerId: "priya-nair",
        name: "PPL Hypertrophy",
        description: "3-day Push/Pull/Legs split optimised for muscle growth. High volume, moderate weight, short rest periods.",
        daysPerWeek: 3,
        days: [
          {
            dayName: "Push Day",
            splitType: "Push",
            exercises: [
              {
                exerciseName: "Barbell Bench Press",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 10, weight: 60, isWarmup: false },
                  { reps: 10, weight: 60, isWarmup: false },
                  { reps: 10, weight: 60, isWarmup: false },
                ],
              },
              {
                exerciseName: "Overhead Press",
                sets: [
                  { reps: 10, weight: 35, isWarmup: false },
                  { reps: 10, weight: 35, isWarmup: false },
                  { reps: 10, weight: 35, isWarmup: false },
                ],
              },
              {
                exerciseName: "Incline Dumbbell Press",
                sets: [
                  { reps: 12, weight: 20, isWarmup: false },
                  { reps: 12, weight: 20, isWarmup: false },
                  { reps: 12, weight: 20, isWarmup: false },
                ],
              },
              {
                exerciseName: "Cable Flyes",
                sets: [
                  { reps: 15, weight: 12, isWarmup: false },
                  { reps: 15, weight: 12, isWarmup: false },
                  { reps: 15, weight: 12, isWarmup: false },
                ],
              },
              {
                exerciseName: "Tricep Pushdown",
                sets: [
                  { reps: 15, weight: 22, isWarmup: false },
                  { reps: 15, weight: 22, isWarmup: false },
                  { reps: 15, weight: 22, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lateral Raise",
                sets: [
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                  { reps: 15, weight: 8, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Pull Day",
            splitType: "Pull",
            exercises: [
              {
                exerciseName: "Barbell Row",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 10, weight: 60, isWarmup: false },
                  { reps: 10, weight: 60, isWarmup: false },
                  { reps: 10, weight: 60, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lat Pulldown",
                sets: [
                  { reps: 12, weight: 50, isWarmup: false },
                  { reps: 12, weight: 50, isWarmup: false },
                  { reps: 12, weight: 50, isWarmup: false },
                ],
              },
              {
                exerciseName: "Seated Cable Row",
                sets: [
                  { reps: 12, weight: 50, isWarmup: false },
                  { reps: 12, weight: 50, isWarmup: false },
                  { reps: 12, weight: 50, isWarmup: false },
                ],
              },
              {
                exerciseName: "Face Pull",
                sets: [
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                  { reps: 15, weight: 20, isWarmup: false },
                ],
              },
              {
                exerciseName: "Barbell Curl",
                sets: [
                  { reps: 12, weight: 25, isWarmup: false },
                  { reps: 12, weight: 25, isWarmup: false },
                  { reps: 12, weight: 25, isWarmup: false },
                ],
              },
              {
                exerciseName: "Hammer Curl",
                sets: [
                  { reps: 12, weight: 14, isWarmup: false },
                  { reps: 12, weight: 14, isWarmup: false },
                  { reps: 12, weight: 14, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Legs Day",
            splitType: "Legs",
            exercises: [
              {
                exerciseName: "Back Squat",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 10, weight: 70, isWarmup: false },
                  { reps: 10, weight: 70, isWarmup: false },
                  { reps: 10, weight: 70, isWarmup: false },
                ],
              },
              {
                exerciseName: "Romanian Deadlift",
                sets: [
                  { reps: 12, weight: 55, isWarmup: false },
                  { reps: 12, weight: 55, isWarmup: false },
                  { reps: 12, weight: 55, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Press",
                sets: [
                  { reps: 15, weight: 90, isWarmup: false },
                  { reps: 15, weight: 90, isWarmup: false },
                  { reps: 15, weight: 90, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Curl",
                sets: [
                  { reps: 15, weight: 35, isWarmup: false },
                  { reps: 15, weight: 35, isWarmup: false },
                  { reps: 15, weight: 35, isWarmup: false },
                ],
              },
              {
                exerciseName: "Dumbbell Calf Raise",
                sets: [
                  { reps: 20, weight: 20, isWarmup: false },
                  { reps: 20, weight: 20, isWarmup: false },
                  { reps: 20, weight: 20, isWarmup: false },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "full-body-3day",
        trainerId: "priya-nair",
        name: "Full Body 3-Day",
        description: "3-day full body program hitting every major muscle group each session. Ideal for beginners or those returning from a break.",
        daysPerWeek: 3,
        days: [
          {
            dayName: "Full Body A",
            splitType: "Full Body",
            exercises: [
              {
                exerciseName: "Back Squat",
                sets: [
                  { reps: 10, weight: 40, isWarmup: true },
                  { reps: 8, weight: 65, isWarmup: false },
                  { reps: 8, weight: 65, isWarmup: false },
                  { reps: 8, weight: 65, isWarmup: false },
                ],
              },
              {
                exerciseName: "Barbell Bench Press",
                sets: [
                  { reps: 10, weight: 35, isWarmup: true },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                ],
              },
              {
                exerciseName: "Barbell Row",
                sets: [
                  { reps: 10, weight: 35, isWarmup: true },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                ],
              },
              {
                exerciseName: "Overhead Press",
                sets: [
                  { reps: 10, weight: 30, isWarmup: false },
                  { reps: 10, weight: 30, isWarmup: false },
                  { reps: 10, weight: 30, isWarmup: false },
                ],
              },
              {
                exerciseName: "Plank",
                sets: [
                  { reps: 30, weight: 0, isWarmup: false },
                  { reps: 30, weight: 0, isWarmup: false },
                  { reps: 30, weight: 0, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Full Body B",
            splitType: "Full Body",
            exercises: [
              {
                exerciseName: "Deadlift",
                sets: [
                  { reps: 8, weight: 60, isWarmup: true },
                  { reps: 5, weight: 90, isWarmup: false },
                  { reps: 5, weight: 90, isWarmup: false },
                  { reps: 5, weight: 90, isWarmup: false },
                ],
              },
              {
                exerciseName: "Incline Dumbbell Press",
                sets: [
                  { reps: 10, weight: 20, isWarmup: false },
                  { reps: 10, weight: 20, isWarmup: false },
                  { reps: 10, weight: 20, isWarmup: false },
                ],
              },
              {
                exerciseName: "Pull-ups",
                sets: [
                  { reps: 8, weight: 0, isWarmup: false },
                  { reps: 8, weight: 0, isWarmup: false },
                  { reps: 8, weight: 0, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lateral Raise",
                sets: [
                  { reps: 12, weight: 8, isWarmup: false },
                  { reps: 12, weight: 8, isWarmup: false },
                  { reps: 12, weight: 8, isWarmup: false },
                ],
              },
              {
                exerciseName: "Hanging Leg Raise",
                sets: [
                  { reps: 12, weight: 0, isWarmup: false },
                  { reps: 12, weight: 0, isWarmup: false },
                  { reps: 12, weight: 0, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Full Body C",
            splitType: "Full Body",
            exercises: [
              {
                exerciseName: "Front Squat",
                sets: [
                  { reps: 10, weight: 35, isWarmup: true },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                  { reps: 8, weight: 55, isWarmup: false },
                ],
              },
              {
                exerciseName: "Dumbbell Bench Press",
                sets: [
                  { reps: 10, weight: 24, isWarmup: false },
                  { reps: 10, weight: 24, isWarmup: false },
                  { reps: 10, weight: 24, isWarmup: false },
                ],
              },
              {
                exerciseName: "Dumbbell Row",
                sets: [
                  { reps: 10, weight: 24, isWarmup: false },
                  { reps: 10, weight: 24, isWarmup: false },
                  { reps: 10, weight: 24, isWarmup: false },
                ],
              },
              {
                exerciseName: "Arnold Press",
                sets: [
                  { reps: 10, weight: 14, isWarmup: false },
                  { reps: 10, weight: 14, isWarmup: false },
                  { reps: 10, weight: 14, isWarmup: false },
                ],
              },
              {
                exerciseName: "Crunches",
                sets: [
                  { reps: 20, weight: 0, isWarmup: false },
                  { reps: 20, weight: 0, isWarmup: false },
                  { reps: 20, weight: 0, isWarmup: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "jake-torres",
    name: "Jake Torres",
    specialty: "Athletic Performance & Conditioning",
    bio: "Performance coach working with athletes and recreational lifters. Focus on building functional strength and explosive power.",
    programs: [
      {
        id: "2day-athletic",
        trainerId: "jake-torres",
        name: "2-Day Athletic Split",
        description: "Minimal time commitment, maximum results. Two full sessions per week covering upper and lower body with athletic movement patterns.",
        daysPerWeek: 2,
        days: [
          {
            dayName: "Upper Body",
            splitType: "Upper Body",
            exercises: [
              {
                exerciseName: "Push Press",
                sets: [
                  { reps: 8, weight: 35, isWarmup: true },
                  { reps: 5, weight: 55, isWarmup: false },
                  { reps: 5, weight: 55, isWarmup: false },
                  { reps: 5, weight: 55, isWarmup: false },
                ],
              },
              {
                exerciseName: "Barbell Row",
                sets: [
                  { reps: 8, weight: 40, isWarmup: true },
                  { reps: 6, weight: 65, isWarmup: false },
                  { reps: 6, weight: 65, isWarmup: false },
                  { reps: 6, weight: 65, isWarmup: false },
                ],
              },
              {
                exerciseName: "Dumbbell Bench Press",
                sets: [
                  { reps: 10, weight: 26, isWarmup: false },
                  { reps: 10, weight: 26, isWarmup: false },
                  { reps: 10, weight: 26, isWarmup: false },
                ],
              },
              {
                exerciseName: "Pull-ups",
                sets: [
                  { reps: 8, weight: 0, isWarmup: false },
                  { reps: 8, weight: 0, isWarmup: false },
                  { reps: 8, weight: 0, isWarmup: false },
                ],
              },
              {
                exerciseName: "Lateral Raise",
                sets: [
                  { reps: 12, weight: 10, isWarmup: false },
                  { reps: 12, weight: 10, isWarmup: false },
                  { reps: 12, weight: 10, isWarmup: false },
                ],
              },
              {
                exerciseName: "Tricep Pushdown",
                sets: [
                  { reps: 12, weight: 22, isWarmup: false },
                  { reps: 12, weight: 22, isWarmup: false },
                  { reps: 12, weight: 22, isWarmup: false },
                ],
              },
            ],
          },
          {
            dayName: "Lower Body",
            splitType: "Lower Body",
            exercises: [
              {
                exerciseName: "Back Squat",
                sets: [
                  { reps: 10, weight: 45, isWarmup: true },
                  { reps: 5, weight: 80, isWarmup: false },
                  { reps: 5, weight: 80, isWarmup: false },
                  { reps: 5, weight: 80, isWarmup: false },
                ],
              },
              {
                exerciseName: "Deadlift",
                sets: [
                  { reps: 8, weight: 60, isWarmup: true },
                  { reps: 5, weight: 95, isWarmup: false },
                  { reps: 5, weight: 95, isWarmup: false },
                  { reps: 5, weight: 95, isWarmup: false },
                ],
              },
              {
                exerciseName: "Bulgarian Split Squat",
                sets: [
                  { reps: 10, weight: 18, isWarmup: false },
                  { reps: 10, weight: 18, isWarmup: false },
                  { reps: 10, weight: 18, isWarmup: false },
                ],
              },
              {
                exerciseName: "Leg Curl",
                sets: [
                  { reps: 12, weight: 32, isWarmup: false },
                  { reps: 12, weight: 32, isWarmup: false },
                  { reps: 12, weight: 32, isWarmup: false },
                ],
              },
              {
                exerciseName: "Calf Raise Machine",
                sets: [
                  { reps: 15, weight: 45, isWarmup: false },
                  { reps: 15, weight: 45, isWarmup: false },
                  { reps: 15, weight: 45, isWarmup: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getPTTrainers(): PTTrainer[] {
  return PT_TRAINERS;
}

export function getPTTrainerById(id: string): PTTrainer | undefined {
  return PT_TRAINERS.find((t) => t.id === id);
}

export function getPTProgramById(
  trainerId: string,
  programId: string
): PTProgram | undefined {
  const trainer = getPTTrainerById(trainerId);
  return trainer?.programs.find((p) => p.id === programId);
}
